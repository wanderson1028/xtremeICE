#!/usr/bin/env python3
"""Exercise disposable Proxmox guests from the host; no Design Studio login or app integration."""
import argparse
import dataclasses
import fcntl
import json
import os
import pathlib
import re
import signal
import subprocess
import tempfile
import time

NODE = "prox"
TEMPLATE = 9000
TEMPLATE_NAME = "debian13-cloudinit-base"
STORE = "nvme-mirror"
TEST_PATH = "/opt/design-studio-proof/permissions.txt"

def call(*args, check=True, timeout=45, input=None):
    return subprocess.run(args, text=True, input=input, check=check, timeout=timeout,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def read(*args):
    return call(*args).stdout.strip()

def require(ok, reason):
    if not ok:
        raise RuntimeError(reason)

def emit(event, **fields):
    print(json.dumps({"event": event, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **fields}), flush=True)

def pve(*resource):
    return json.loads(read("pvesh", "get", *resource, "--output-format", "json"))

@dataclasses.dataclass
class Guest:
    vmid: int
    bridge: str
    ns: str
    temp: pathlib.Path
    label: str
    addr: str
    created: bool = False
    network: bool = False
    namespaces: bool = False

    @property
    def name(self):
        return f"ds-proof-{self.label}-{self.vmid}"

    def run(self, *args, **opts):
        return call("ip", "netns", "exec", self.ns, *args, **opts)

    def connect(self, key, user, command, **opts):
        return self.run("ssh", "-oBatchMode=yes", "-oIdentitiesOnly=yes", "-oConnectTimeout=4",
                        "-oForwardAgent=no", "-oUserKnownHostsFile=" + str(self.temp / "guest_hosts"),
                        "-oGlobalKnownHostsFile=/dev/null", "-oStrictHostKeyChecking=accept-new",
                        "-i", str(key), user + "@" + self.addr, command, **opts)

    def key(self, label):
        key = self.temp / label
        call("ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", self.name + "-" + label, "-f", str(key))
        return key

    def config_path(self):
        return pathlib.Path(f"/etc/pve/nodes/{NODE}/qemu-server/{self.vmid}.conf")

    def create(self):
        require(not self.config_path().exists() and not pathlib.Path("/sys/class/net", self.bridge).exists(),
                "The proposed VM ID or network already exists")
        require(not pathlib.Path("/run/netns", self.ns).exists(), "The proposed namespace already exists")
        require(not pve(f"/nodes/{NODE}/storage/{STORE}/content", "--vmid", str(self.vmid)),
                "The proposed ID already owns storage")
        self.temp.mkdir(mode=0o700)
        admin, learner = self.key("admin"), self.key("learner")
        self.network = True
        call("ip", "link", "add", self.bridge, "type", "bridge")
        call("sysctl", "-qw", f"net.ipv6.conf.{self.bridge}.disable_ipv6=1")
        call("ip", "link", "set", self.bridge, "up")
        self.namespaces = True
        call("ip", "netns", "add", self.ns)
        veth = "dsp" + str(self.vmid)
        call("ip", "link", "add", veth, "type", "veth", "peer", "name", "client", "netns", self.ns)
        call("ip", "link", "set", veth, "master", self.bridge)
        call("ip", "link", "set", veth, "up")
        self.run("ip", "link", "set", "lo", "up")
        self.run("ip", "addr", "add", "172.29.253.1/24", "dev", "client")
        self.run("ip", "link", "set", "client", "up")
        self.created = True
        call("qm", "clone", str(TEMPLATE), str(self.vmid), "--name", self.name, "--full", "0", timeout=90)
        config = read("qm", "config", str(self.vmid))
        require(re.search(r"^name: " + re.escape(self.name) + r"$", config, re.M), "Clone name mismatch")
        m = re.search(r"^net0: (virtio=[0-9a-fA-F:]{17})(?:,|$)", config, re.M)
        require(m and not re.search(r"^net[1-9][0-9]*:", config, re.M), "Unexpected clone NICs")
        call("qm", "set", str(self.vmid), "--net0", m.group(1) + ",bridge=" + self.bridge,
             "--ipconfig0", f"ip={self.addr}/24", "--ciuser", "debian", "--sshkeys", str(admin) + ".pub",
             "--memory", "1024", "--onboot", "0", "--ciupgrade", "0")
        call("qm", "start", str(self.vmid))
        deadline = time.monotonic() + 135
        while time.monotonic() < deadline:
            r = self.connect(admin, "debian", "cloud-init status --format json", check=False, timeout=8)
            if r.returncode in (0, 2):
                try:
                    status = json.loads(r.stdout)
                except ValueError:
                    status = {}
                if (status.get("status") == "done" and not status.get("errors")
                    and set(status.get("recoverable_errors") or {}) <= {"DEPRECATED"}):
                    emit("cloud_init_ready", vmid=self.vmid, extended_status=status.get("extended_status"))
                    break
            time.sleep(3)
        else:
            raise RuntimeError(f"Cloud-init and key login did not finish for VM {self.vmid}")
        pub = pathlib.Path(str(learner) + ".pub").read_text().strip()
        require(re.fullmatch(r"ssh-ed25519 [A-Za-z0-9+/=]+ [A-Za-z0-9-]+", pub), "Invalid proof public key")
        self.connect(admin, "debian", "sudo -n /bin/sh -se", input=f"""
useradd -m -s /bin/bash learner
install -d -o learner -g learner -m 700 /home/learner/.ssh
umask 077
printf '%s\\n' '{pub}' > /home/learner/.ssh/authorized_keys
chown learner:learner /home/learner/.ssh/authorized_keys
install -d -o root -g root -m 755 /opt/design-studio-proof
install -o learner -g learner -m 644 /dev/null {TEST_PATH}
""")
        result = self.connect(learner, "learner", "id -u; id -un; ip -4 route; ip -6 route show default")
        require(result.stdout.splitlines()[0] != "0" and result.stdout.splitlines()[1] == "learner",
                "Learner identity invalid")
        require("default" not in result.stdout, "Guest unexpectedly has a default route")
        require(self.connect(learner,"learner","sudo -n /usr/bin/true",check=False).returncode == 1,
                "Learner privilege probe returned an unexpected outcome")
        emit("learner_ready", vmid=self.vmid, label=self.label, address=self.addr)

    def grade(self):
        mode = self.connect(self.temp / "admin", "debian", "/usr/bin/stat -c %a -- " + TEST_PATH).stdout.strip()
        require(re.fullmatch("[0-7]{3,4}", mode), "Unexpected grading result")
        emit("guest_file_mode", vmid=self.vmid, label=self.label, actual=mode, passed=mode == "600")
        return mode

    def cleanup(self):
        vmid = str(self.vmid)
        if self.created and self.config_path().exists():
            config = read("qm", "config", vmid)
            require("name: " + self.name in config.splitlines(), "Refusing to touch an unexpected VM")
            if read("qm", "status", vmid) != "status: stopped":
                shut = call("qm", "shutdown", vmid, "--timeout", "30", check=False, timeout=40)
                if shut.returncode != 0 and read("qm", "status", vmid) != "status: stopped":
                    call("qm", "stop", vmid, timeout=45)
            require(read("qm", "status", vmid) == "status: stopped", "VM did not stop")
            call("qm", "destroy", vmid, "--purge", "1", "--destroy-unreferenced-disks", "1", timeout=60)
        if self.created:
            require(not self.config_path().exists(), "VM config remains")
            require(not pve(f"/nodes/{NODE}/storage/{STORE}/content", "--vmid", vmid), "Guest storage remains")
        if self.namespaces and pathlib.Path("/run/netns", self.ns).exists():
            call("ip", "netns", "delete", self.ns)
        if self.network and pathlib.Path("/sys/class/net", self.bridge).exists():
            call("ip", "link", "delete", self.bridge)
        emit("disposed", vmid=self.vmid, label=self.label)

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--first-vmid", required=True, type=int)
    args = ap.parse_args()
    require(9500 <= args.first_vmid <= 9598, "Use a reserved proof pair within 9500–9599")
    require(os.geteuid() == 0 and read("hostname", "-s") == NODE, "Wrong host or account")
    with open("/run/lock/design-studio-guest-proof.lock", "a", encoding="ascii") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with tempfile.TemporaryDirectory(prefix="ds-proxmox-proof-") as work:
            info = pve(f"/nodes/{NODE}/qemu/{TEMPLATE}/config")
            require(info.get("template") == 1 and info.get("name") == TEMPLATE_NAME and
                    "link_down=1" in info.get("net0", "") and not info.get("sshkeys") and
                    not info.get("cipassword") and not info.get("cicustom") and not info.get("ciuser") and
                    info.get("scsi0", "").startswith(STORE + ":"), "Source template differs from preflight")
            guests = [Guest(args.first_vmid+i, f"vmbr{args.first_vmid+i}",
                            f"dsproof{args.first_vmid+i}", pathlib.Path(work) / label,
                            label, f"172.29.253.{11+i}") for i,label in enumerate(("a","b"))]
            a,b = guests
            try:
                for g in guests:
                    g.create()
                for active, peer in [(a,b),(b,a)]:
                    ping = active.run("ping", "-c", "1", "-W", "2", peer.addr, check=False)
                    require(ping.returncode == 1, "Peer isolation ping did not give the expected no-response result")
                    bad_key = active.connect(peer.temp / "learner", "learner", "/usr/bin/id", check=False)
                    require(bad_key.returncode == 255 and "Permission denied" in bad_key.stderr,
                            "Wrong learner key was not explicitly rejected")
                    emit("peer_isolation", vmid=active.vmid, unreachable=peer.addr, peer_key_rejected=True)
                require(a.grade() == b.grade() == "644", "File did not start at 644")
                a.connect(a.temp / "learner", "learner", "/usr/bin/chmod 600 -- " + TEST_PATH)
                require(a.grade() == "600" and b.grade() == "644", "Mode change or guest independence not verified")
                a.cleanup()
                a.created = a.namespaces = a.network = False
                emit("guest_finish", vmid=a.vmid, score=100)
                cutoff = time.monotonic() + 30
                emit("guest_expiry_wait", vmid=b.vmid, seconds=30)
                require(read("qm", "status", str(b.vmid)) == "status: running", "Expiry target is not running")
                time.sleep(max(0, cutoff - time.monotonic()))
                b.cleanup()
                b.created = b.namespaces = b.network = False
                emit("guest_expired", vmid=b.vmid, score=0)
            finally:
                errors = []
                for g in guests:
                    if g.created or g.namespaces or g.network:
                        try:
                            g.cleanup()
                        except Exception as e:
                            emit("cleanup_failed", vmid=g.vmid, label=g.label, reason=type(e).__name__)
                            errors.append(g.vmid)
                require(not errors, f"Review resources for VM IDs {errors}; cleanup did not complete")
    emit("host_proof_complete", app_proof=False)

def interrupted(_signum, _frame):
    raise SystemExit("Proxmox proof interrupted")

if __name__ == "__main__":
    signal.signal(signal.SIGHUP, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    try:
        main()
    except subprocess.CalledProcessError as error:
        emit("command_failed", command=error.cmd[:4], code=error.returncode,
             detail=(error.stderr or "").strip()[-750:])
        raise SystemExit(1)
