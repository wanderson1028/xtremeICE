#!/usr/bin/env python3
import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

APP_ID = os.environ["BASE44_APP_ID"]
FUNCTION_URL = os.environ["BASE44_FUNCTION_URL"]
WORKER_TOKEN = os.environ["BASE44_WORKER_TOKEN"]
PVE_URL = os.environ.get("PVE_URL", "https://10.10.30.101:8006").rstrip("/")
PVE_NODE = os.environ.get("PVE_NODE", "prox")
PVE_TOKEN_ID = os.environ["PVE_TOKEN_ID"]
PVE_TOKEN_SECRET = os.environ["PVE_TOKEN_SECRET"]
TLS_SETTING = os.environ.get("PVE_VERIFY_TLS", "1")
if TLS_SETTING not in ("0", "1"):
    raise ValueError("PVE_VERIFY_TLS must be 0 or 1")
VERIFY_TLS = TLS_SETTING == "1"
PVE_CA_FILE = os.environ.get("PVE_CA_FILE", "").strip()
POLL_SECONDS = max(2, int(os.environ.get("POLL_SECONDS", "5")))
WORKER_VERSION = "1.2.0"

if urllib.parse.urlsplit(PVE_URL).scheme != "https":
    raise ValueError("PVE_URL must use HTTPS")
PVE_SSL_CONTEXT = (ssl.create_default_context(cafile=PVE_CA_FILE or None)
                   if VERIFY_TLS else ssl._create_unverified_context())

def request_json(url, method="GET", headers=None, body=None, context=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("User-Agent", "DesignStudio-ProxmoxWorker/1.0")
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, context=context, timeout=20) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}

def relay(action, **payload):
    headers = {
        "X-Provider-Worker-Token": WORKER_TOKEN,
        "X-App-Id": APP_ID,
        "Base44-Functions-Version": "preview",
    }
    return request_json(FUNCTION_URL, "POST", headers, {"action": action, "worker_version": WORKER_VERSION, **payload})

def pve(path, method="GET"):
    headers = {
        "Authorization": "PVEAPIToken=" + PVE_TOKEN_ID + "=" + PVE_TOKEN_SECRET,
    }
    return request_json(PVE_URL + "/api2/json" + path, method, headers, context=PVE_SSL_CONTEXT).get("data")

def wait_for_task(upid):
    encoded = urllib.parse.quote(upid, safe="")
    for _ in range(120):
        task = pve("/nodes/{}/tasks/{}/status".format(urllib.parse.quote(PVE_NODE), encoded)) or {}
        if task.get("status") == "stopped":
            exit_status = task.get("exitstatus")
            if exit_status != "OK":
                raise RuntimeError("Proxmox task failed: " + str(exit_status or "unknown"))
            return {"status": "stopped", "exit_status": exit_status}
        time.sleep(0.5)
    raise TimeoutError("Proxmox task did not finish within 60 seconds")


def run_job(job):
    operation = job["operation"]
    vmid = int(job.get("parameters", {}).get("vmid", 0))
    if operation in ("vm_start", "vm_stop") and vmid != 101:
        raise ValueError("VM mutation is limited to the disposable VM101 pilot")

    if operation == "inventory":
        rows = pve("/cluster/resources?type=vm") or []
        return {
            "cluster": [
                {
                    "vmid": row.get("vmid"),
                    "name": row.get("name"),
                    "node": row.get("node"),
                    "type": row.get("type"),
                    "status": row.get("status"),
                    "cpu": row.get("cpu"),
                    "maxcpu": row.get("maxcpu"),
                    "mem": row.get("mem"),
                    "maxmem": row.get("maxmem"),
                }
                for row in rows
            ]
        }

    path = "/nodes/{}/qemu/{}".format(urllib.parse.quote(PVE_NODE), vmid)
    if operation == "vm_status":
        data = pve(path + "/status/current") or {}
        return {
            "vmid": vmid,
            "name": data.get("name"),
            "node": PVE_NODE,
            "status": data.get("status"),
            "qmpstatus": data.get("qmpstatus"),
            "uptime": data.get("uptime"),
            "cpu": data.get("cpu"),
            "cpus": data.get("cpus"),
            "mem": data.get("mem"),
            "maxmem": data.get("maxmem"),
        }
    if operation == "vm_start":
        upid = pve(path + "/status/start", "POST")
        task = wait_for_task(upid)
        return {"vmid": vmid, "node": PVE_NODE, "requested_state": "running", "task": task}
    if operation == "vm_stop":
        upid = pve(path + "/status/shutdown", "POST")
        task = wait_for_task(upid)
        return {"vmid": vmid, "node": PVE_NODE, "requested_state": "stopped", "task": task}
    raise ValueError("Unsupported operation")

def main():
    print("Proxmox worker started", flush=True)
    while True:
        try:
            response = relay("poll")
            job = response.get("job")
            if not job:
                time.sleep(POLL_SECONDS)
                continue
            try:
                result = run_job(job)
                relay("complete", job_id=job["id"], success=True, result=result)
            except Exception as exc:
                relay("complete", job_id=job["id"], success=False, error=str(exc)[:1000])
        except Exception as exc:
            print("poll error: " + str(exc)[:500], flush=True)
            time.sleep(POLL_SECONDS)

if __name__ == "__main__":
    main()
