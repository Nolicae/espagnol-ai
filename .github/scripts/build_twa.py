#!/usr/bin/env python3
import pty
import os
import select
import sys
import subprocess
import time
import threading

master_fd, slave_fd = pty.openpty()

proc = subprocess.Popen(
    ["bubblewrap", "build", "--skipPwaValidation"],
    stdin=slave_fd,
    stdout=slave_fd,
    stderr=slave_fd,
    close_fds=True,
)
os.close(slave_fd)

# Answered once each, in order
sequential = [
    (b"install the JDK", b"Y\n"),
    (b"install the Android SDK", b"Y\n"),
    (b"Do you agree to the Android SDK terms", b"Yes\n"),
    (b"application versionName", b"1.0.0\n"),
    (b"application versionCode", b"1\n"),
]

# Answered every time they appear (sdkmanager licence prompts)
repeating = [
    (b"Accept? (y/n)", b"y\n"),
]

idx = 0
buf = b""
start = time.time()
done = threading.Event()

def heartbeat():
    while not done.wait(60):
        elapsed = int(time.time() - start)
        print(f"[heartbeat] {elapsed}s elapsed, build still running (pid {proc.pid})", flush=True)

threading.Thread(target=heartbeat, daemon=True).start()

while True:
    r, _, _ = select.select([master_fd], [], [], 1.0)
    if r:
        try:
            chunk = os.read(master_fd, 4096)
        except OSError:
            break
        sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()
        buf += chunk

        # Repeating prompts (sdkmanager licence acceptation)
        answered = False
        for kw, ans in repeating:
            if kw in buf:
                time.sleep(0.3)
                os.write(master_fd, ans)
                buf = b""
                answered = True
                break

        # Sequential prompts (bubblewrap interactive setup)
        if not answered and idx < len(sequential):
            kw, ans = sequential[idx]
            if kw in buf:
                time.sleep(0.5)
                os.write(master_fd, ans)
                idx += 1
                buf = b""
    elif proc.poll() is not None:
        break

done.set()
proc.wait()
print(f"\nbubblewrap exited with code {proc.returncode} after {int(time.time()-start)}s", flush=True)
sys.exit(proc.returncode)
