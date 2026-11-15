#!/usr/bin/env python3
"""Outbound worker for the two Design Studio Proxmox staging slots."""
import fcntl
import importlib.util
import json
import os
import pathlib
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

helper_path = pathlib.Path(__file__).with_name("proxmox-guest-proof.py")
helper_spec = importlib.util.spec_from_file_location("design_studio_guest", helper_path)
guest_module = importlib.util.module_from_spec(helper_spec)
sys.modules[helper_spec.name] = guest_module
helper_spec.loader.exec_module(guest_module)
Guest = guest_module.Guest
emit, pve, read, require = guest_module.emit, guest_module.pve, guest_module.read, guest_module.require
NODE, TEMPLATE, TEMPLATE_NAME, STORE, TEST_PATH = (
    guest_module.NODE, guest_module.TEMPLATE, guest_module.TEMPLATE_NAME, guest_module.STORE, guest_module.TEST_PATH
)

ROOT = pathlib.Path("/var/lib/xtreme-ice-proxmox-learner")
SLOTS = {"a": (9530, "172.29.253.31"), "b": (9531, "172.29.253.32")}
ALLOWED_ID = re.compile(r"[a-f0-9]{24}")
COMMANDS = {
    "identity": "/usr/bin/id",
    "stat": "/usr/bin/stat -c %a -- " + TEST_PATH,
    "chmod": "/usr/bin/chmod 600 -- " + TEST_PATH + " && /usr/bin/stat -c %a -- " + TEST_PATH,
}

class Retry(Exception):
    pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect())

def write_json(path, value):
    swap = path.with_suffix(".tmp")
    with swap.open("w", encoding="utf-8") as stream:
        json.dump(value, stream)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(swap, path)
    fd = os.open(path.parent, os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)

def assert_template():
    info = pve(f"/nodes/{NODE}/qemu/{TEMPLATE}/config")
    require(info.get("template") == 1 and info.get("name") == TEMPLATE_NAME and
            "link_down=1" in info.get("net0", "") and not info.get("sshkeys") and
            not info.get("cipassword") and not info.get("cicustom") and not info.get("ciuser") and
            info.get("scsi0", "").startswith(STORE + ":"), "Source template differs")
    require(read("qm", "status", str(TEMPLATE)) == "status: stopped", "Source template is not offline")

def has_owned_config(g):
    if not g.config_path().exists():
        return False
    require("name: " + g.name in read("qm", "config", str(g.vmid)).splitlines(),
            "Reserved slot holds an unrelated VM")
    return True

def bridge_present(g):
    return pathlib.Path("/sys/class/net", g.bridge).exists()

def namespace_present(g):
    return pathlib.Path("/run/netns", g.ns).exists()

def absent(g):
    return (not g.config_path().exists(),
            not pve(f"/nodes/{NODE}/storage/{STORE}/content", "--vmid", str(g.vmid)),
            not bridge_present(g) and not namespace_present(g))

def erase_guest_keys(g):
    if g.temp.exists():
        require(not g.temp.is_symlink(), "Unsafe guest-key directory")
        for filename in ("admin", "admin.pub", "learner", "learner.pub", "guest_hosts", "guest_hosts.old"):
            (g.temp / filename).unlink(missing_ok=True)
        g.temp.rmdir()

def run_mode(g):
    mode = g.connect(g.temp / "admin", "debian", "/usr/bin/stat -c %a -- " + TEST_PATH, timeout=10).stdout.strip()
    require(re.fullmatch(r"[0-7]{3,4}", mode), "Invalid file-mode evidence")
    return mode

class Worker:
    def __init__(self):
        self.app = (ROOT / "app-id").read_text().strip()
        self.key = (ROOT / "worker.key").read_text().strip()
        require(ALLOWED_ID.fullmatch(self.app) and re.fullmatch(r"[a-f0-9]{64}", self.key), "Invalid worker config")
        require(self.app == "69a0a5a90473fac0aa3ea135", "Wrong Xtreme I.C.E. app")
        self.url = (ROOT / "gateway-url").read_text().strip()
        destination = urlsplit(self.url)
        require(destination.scheme == "https" and
                (destination.hostname == "base44.app" or destination.hostname == "app.base44.com" or
                 (destination.hostname or "").endswith(".base44.app")) and
                not destination.username and not destination.password and destination.port is None and
                destination.path == f"/api/apps/{self.app}/functions/proxmoxLearner" and
                not destination.query and not destination.fragment, "Invalid Base44 gateway")
        self.functions_version = (ROOT / "functions-version").read_text().strip()
        require(re.fullmatch(r"[A-Za-z0-9._:-]{1,150}", self.functions_version) is not None,
                "An explicit branch function version is required")
        self.file = ROOT / "leases.json"
        self.leases = json.loads(self.file.read_text()) if self.file.exists() else {}
        require(isinstance(self.leases, dict) and set(self.leases) <= set(SLOTS), "Unexpected lease state")
        self.guests = {
            label: Guest(vmid, f"vmbr{vmid}", f"dsproof{vmid}", ROOT / label, label, addr)
            for label, (vmid, addr) in SLOTS.items()
        }
        for label, guest in self.guests.items():
            lease = self.leases.get(label)
            if not lease or lease.get("confirmed"):
                require(all(absent(guest)) and not guest.temp.exists(), "Free VM slot is occupied")
                continue
            require(ALLOWED_ID.fullmatch(lease.get("id", "")), "Invalid run lease")
            guest.created = has_owned_config(guest)
            guest.network = bridge_present(guest)
            guest.namespaces = namespace_present(guest)

    def update(self, label, patch):
        self.leases.setdefault(label, {}).update(patch)
        write_json(self.file, self.leases)

    def api(self, data):
        request = urllib.request.Request(self.url, data=json.dumps(data).encode(), method="POST", headers={
            "Content-Type": "application/json",
            "Base44-Functions-Version": self.functions_version,
            "X-App-Id": self.app,
            "X-Proxmox-Learner-Worker": self.key,
        })
        try:
            with opener.open(request, timeout=10) as response:
                result = json.loads(response.read(120_000))
        except urllib.error.HTTPError as exc:
            raise Retry(f"{data['action']} {data.get('event', '')} returned HTTP {exc.code}") from None
        except (ValueError, OSError):
            raise Retry(f"{data['action']} response unavailable") from None
        if result.get("ok") is not True:
            raise Retry("App did not acknowledge the worker request")
        return result

    def event(self, g, run, name, **payload):
        return self.api({"action": "workerEvent", "run_id": run["id"], "vmid": g.vmid,
                         "event": name, **payload})["run"]

    def lease(self, run):
        require(ALLOWED_ID.fullmatch(run.get("id", "")), "Invalid run id")
        for label, state in self.leases.items():
            if state["id"] == run["id"]:
                guest = self.guests[label]
                require(run.get("vmid") in (None, guest.vmid), "App and worker bindings disagree")
                return guest, state
        require(run.get("vmid") is None, "Missing local lease for a previously allocated VM")
        for label, guest in self.guests.items():
            if label not in self.leases or self.leases[label].get("confirmed"):
                require(all(absent(guest)) and not guest.temp.exists(), "Requested slot is occupied")
                self.leases[label] = {"id": run["id"]}
                self.update(label, {})
                return guest, self.leases[label]
        return None, None

    def command(self, g, kind):
        if kind == "isolation":
            peer = self.guests["b" if g.label == "a" else "a"]
            if not has_owned_config(peer) or read("qm", "status", str(peer.vmid)) != "status: running":
                return "Peer lab is not running."
            ping = g.connect(g.temp / "learner", "learner", "/usr/bin/ping -4 -c 1 -W 2 -- " + peer.addr,
                             check=False, timeout=10)
            require(ping.returncode in (0, 1), "Peer probe did not run")
            key = g.connect(peer.temp / "learner", "learner", "/usr/bin/id", check=False, timeout=10)
            blocked = ping.returncode == 1
            rejected = key.returncode == 255 and "Permission denied" in key.stderr
            emit("peer_check", vmid=g.vmid, peer=peer.vmid, network_denied=blocked, key_denied=rejected)
            return ("Peer lab unreachable from this VM (0 replies)." if blocked else "Peer lab replied.") + (
                "\nPeer learner key denied." if rejected else "\nPeer learner key was not denied."
            )
        require(kind in COMMANDS, "Unknown command")
        return g.connect(g.temp / "learner", "learner", COMMANDS[kind], timeout=10).stdout.strip()

    def operate(self, g, state, run, now):
        stage = run["stage"]
        if stage == "queued":
            self.event(g, run, "provisioning")
            return
        if stage == "provisioning":
            if not state.get("ready"):
                if state.get("attempted"):
                    self.event(g, run, "abort")
                    return
                assert_template()
                self.update(g.label, {"attempted": True})
                g.create()
                self.update(g.label, {"ready": True})
                emit("provisioned", vmid=g.vmid, run_id=run["id"])
            self.event(g, run, "ready")
            return
        if stage == "active":
            if not state.get("ready") or not has_owned_config(g) or not namespace_present(g) or not bridge_present(g):
                self.event(g, run, "abort")
                return
            if now >= run["expires_at"]:
                self.event(g, run, "expire")
                emit("expiry_triggered", vmid=g.vmid, deadline=run["expires_at"])
                return
            if run.get("command_request") and run["command_request"] != run.get("command_done"):
                self.event(g, run, "command", request_id=run["command_request"],
                           output=self.command(g, run.get("command_kind")))
            if run.get("grade_request") and run["grade_request"] != run.get("grade_done"):
                mode = run_mode(g)
                self.event(g, run, "grade", request_id=run["grade_request"], mode=mode)
                emit("graded", vmid=g.vmid, mode=mode)
            return
        require(stage == "cleanup_pending", "Unexpected run state")
        if not run.get("finalized_at"):
            if run.get("reason") != "failure" and "final_mode" not in state:
                self.update(g.label, {"final_mode": run_mode(g)})
            snapshot = {"vmid": g.vmid, "reason": run.get("reason"), "mode": state.get("final_mode")}
            write_json(ROOT / f"result-{run['id']}.json", snapshot)
            result = self.event(g, run, "finalize", mode=snapshot["mode"])
            emit("result_saved_before_delete", vmid=g.vmid, outcome=snapshot["reason"], score=result["final_score"])
            return
        if g.created or g.network or g.namespaces:
            g.cleanup()
            g.created = g.network = g.namespaces = False
        vm, disks, network = absent(g)
        require(vm and disks and network, "Verify VM, storage and network absence before releasing a slot")
        erase_guest_keys(g)
        self.update(g.label, {"provider_absent": True})
        result = self.event(g, run, "cleaned", vm_absent=vm, disks_absent=disks, network_absent=network)
        self.update(g.label, {"confirmed": True})
        emit("provider_cleanup_committed", vmid=g.vmid, stage=result["stage"], score=result["final_score"])

    def loop(self):
        emit("worker_started", app=self.app, existing_leases=len(self.leases))
        failures = 0
        while True:
            try:
                response = self.api({"action": "workerPoll"})
                failures = 0
                open_ids = {run["id"] for run in response["runs"]}
                for label, state in self.leases.items():
                    if state.get("provider_absent") and not state.get("confirmed") and state["id"] not in open_ids:
                        result = self.api({"action": "workerRead", "run_id": state["id"]})
                        if result["run"]["cleanup_verified"] and all(absent(self.guests[label])):
                            self.update(label, {"confirmed": True})
                for run in sorted(response["runs"], key=lambda item: item["stage"] != "cleanup_pending"):
                    g, state = None, None
                    try:
                        g, state = self.lease(run)
                        if g:
                            self.operate(g, state, run, response["now"])
                    except Retry as error:
                        emit("retry", vmid=g.vmid if g else None, error=str(error))
                    except Exception as error:
                        detail = ((error.stderr or "").strip()[-250:] if isinstance(error, subprocess.CalledProcessError)
                                  else str(error))
                        emit("worker_error", vmid=g.vmid if g else None, error=detail)
                        if g and run["stage"] == "provisioning":
                            try:
                                self.event(g, run, "abort")
                            except Retry:
                                pass
            except Retry as error:
                failures += 1
                if failures == 1 or failures % 15 == 0:
                    emit("gateway_unavailable", error=str(error))
            time.sleep(2)

def stop(_signal, _frame):
    raise SystemExit(0)

if __name__ == "__main__":
    require(os.geteuid() == 0 and read("hostname", "-s") == NODE, "Wrong node or account")
    os.umask(0o077)
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGHUP, stop)
    with open("/run/lock/design-studio-guest-proof.lock", "a", encoding="ascii") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        assert_template()
        Worker().loop()
