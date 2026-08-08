"""
AeroIntel AI - One-Click Launcher
==================================
Starts: Ollama server, FastAPI backend, Next.js frontend
On close (window X, Ctrl+C, or normal exit): kills ALL of them (whole process trees).

BEFORE BUILDING: edit the CONFIG section below with your actual paths/commands.
"""

import os
import sys
import time
import atexit
import socket
import threading
import webbrowser
import subprocess
from collections import deque

import psutil

# ----------------------------- CONFIG -----------------------------------
# Edit these to match your machine.

OLLAMA_CMD = ["ollama", "serve"]

BACKEND_DIR = r"C:\AI\Aircraft instructor"
# IMPORTANT: point this at the python.exe INSIDE your virtual environment
# (the one where you ran `pip install uvicorn`), NOT a bare "python".
# Find it by activating your venv and running:  where python   (first line it prints)
BACKEND_PYTHON = r"C:\AI\Aircraft instructor\.venv\Scripts\python.exe"
BACKEND_CMD = [BACKEND_PYTHON, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]  # keep in sync with BACKEND_PORT below

FRONTEND_DIR = r"C:\AI\Aircraft instructor\forntend"
FRONTEND_CMD = ["npm", "run", "dev"]

OLLAMA_WARMUP_SECONDS = 3
BACKEND_PORT = 8000
FRONTEND_PORT = 3000
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"
# Max seconds to wait for backend to start listening before giving up
BACKEND_READY_TIMEOUT = 60
# Max seconds to wait for frontend to start listening before giving up
FRONTEND_READY_TIMEOUT = 60
# How long to wait after starting the backend before we start treating an
# exit as a "crash" worth stopping everything for. Heavy RAG/embedding
# imports can take a while, so give it real breathing room.
BACKEND_GRACE_SECONDS = 20
# --------------------------------------------------------------------------

CREATE_NEW_PROCESS_GROUP = 0x00000200

processes = []      # list of (name, Popen)
last_output = {}     # name -> deque of recent output lines
started_at = {}       # name -> timestamp process was started


def is_port_in_use(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def _stream_reader(proc, name):
    buf = last_output.setdefault(name, deque(maxlen=30))
    try:
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            line = line.rstrip()
            print(f"[{name}] {line}", flush=True)
            buf.append(line)
    except Exception:
        pass


def start_process(cmd, cwd=None, name=""):
    print(f"[launcher] Starting {name}: {' '.join(cmd)}")
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            shell=(sys.platform == "win32"),
            creationflags=CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        processes.append((name, proc))
        started_at[name] = time.time()
        t = threading.Thread(target=_stream_reader, args=(proc, name), daemon=True)
        t.start()
        return proc
    except FileNotFoundError as e:
        print(f"[launcher] ERROR: could not start {name}: {e}")
        return None


def wait_until_ready(proc, port, name, timeout):
    """Poll a port until it accepts connections, or the process dies, or timeout."""
    print(f"[launcher] Waiting for {name} to be ready on port {port}...")
    start = time.time()
    while time.time() - start < timeout:
        if proc.poll() is not None:
            print(f"[launcher] {name} exited (code {proc.returncode}) before becoming ready.")
            tail = last_output.get(name)
            if tail:
                print(f"[launcher] Last output from {name}:")
                for line in tail:
                    print(f"    {line}")
            return False
        if is_port_in_use("127.0.0.1", port):
            print(f"[launcher] {name} is ready ({time.time() - start:.1f}s).")
            return True
        time.sleep(0.5)
    print(f"[launcher] Timed out waiting for {name} to become ready after {timeout}s.")
    return False


def kill_tree(proc, name=""):
    if proc is None or proc.poll() is not None:
        return
    try:
        parent = psutil.Process(proc.pid)
        children = parent.children(recursive=True)
        for child in children:
            try:
                child.terminate()
            except psutil.NoSuchProcess:
                pass
        gone, alive = psutil.wait_procs(children, timeout=5)
        for p in alive:
            try:
                p.kill()
            except psutil.NoSuchProcess:
                pass
        parent.terminate()
        try:
            parent.wait(5)
        except psutil.TimeoutExpired:
            parent.kill()
        print(f"[launcher] Stopped {name} (pid {proc.pid})")
    except psutil.NoSuchProcess:
        pass


def cleanup():
    print("\n[launcher] Shutting down all services...")
    for name, proc in reversed(processes):
        kill_tree(proc, name)
    print("[launcher] All services stopped.")


def validate_dirs():
    ok = True
    for label, path in [("BACKEND_DIR", BACKEND_DIR), ("FRONTEND_DIR", FRONTEND_DIR)]:
        if not os.path.isdir(path):
            print(f"[launcher] ERROR: {label} does not exist or is not a folder:\n    {path}")
            print(f"[launcher]        -> Open File Explorer, copy the real folder path, and paste it into {label} in launcher.py")
            ok = False
    if not os.path.isfile(BACKEND_PYTHON):
        print(f"[launcher] ERROR: BACKEND_PYTHON does not exist:\n    {BACKEND_PYTHON}")
        print(f"[launcher]        -> Activate your venv, run 'where python', and paste the FIRST path it prints into BACKEND_PYTHON in launcher.py")
        ok = False
    if not ok:
        input("\n[launcher] Fix the path(s) above in launcher.py, then re-run. Press Enter to exit...")
        sys.exit(1)


def main():
    atexit.register(cleanup)
    validate_dirs()

    if is_port_in_use("127.0.0.1", 11434):
        print("[launcher] Ollama already running on port 11434 - skipping start (won't be shut down on close either).")
    else:
        start_process(OLLAMA_CMD, name="Ollama")
        time.sleep(OLLAMA_WARMUP_SECONDS)

    backend_proc = start_process(BACKEND_CMD, cwd=BACKEND_DIR, name="Backend")
    if backend_proc is None or not wait_until_ready(backend_proc, BACKEND_PORT, "Backend", BACKEND_READY_TIMEOUT):
        print("[launcher] Backend did not come up. Aborting startup.")
        sys.exit(1)

    frontend_proc = start_process(FRONTEND_CMD, cwd=FRONTEND_DIR, name="Frontend")
    if frontend_proc is None or not wait_until_ready(frontend_proc, FRONTEND_PORT, "Frontend", FRONTEND_READY_TIMEOUT):
        print("[launcher] Frontend did not come up. Aborting startup.")
        sys.exit(1)

    print("\n[launcher] All services are up and ready.")
    print(f"[launcher] Backend:  http://localhost:{BACKEND_PORT}")
    print(f"[launcher] Frontend: {FRONTEND_URL}")
    print("[launcher] Opening frontend in your browser...")
    webbrowser.open(FRONTEND_URL)
    print("[launcher] Close this window OR press Ctrl+C to stop everything.\n")

    if sys.platform == "win32":
        try:
            import win32api

            def handler(ctrl_type):
                cleanup()
                os._exit(0)
                return True

            win32api.SetConsoleCtrlHandler(handler, True)
        except ImportError:
            print("[launcher] (tip: pip install pywin32 for more reliable close-button handling)")

    try:
        while True:
            time.sleep(1)
            for name, proc in processes:
                if proc.poll() is not None:
                    age = time.time() - started_at.get(name, 0)
                    # Backend takes time to import heavy libs; don't panic on quick checks,
                    # but DO report immediately once it has actually exited.
                    print(f"\n[launcher] {name} exited (code {proc.returncode}) after {age:.1f}s.")
                    tail = last_output.get(name)
                    if tail:
                        print(f"[launcher] Last output from {name}:")
                        for line in tail:
                            print(f"    {line}")
                    else:
                        print(f"[launcher] {name} produced no output before exiting.")
                    print("[launcher] Stopping remaining services...")
                    sys.exit(1)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()