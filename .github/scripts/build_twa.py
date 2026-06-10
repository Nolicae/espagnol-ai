#!/usr/bin/env python3
"""
PTY-based bubblewrap interaction: answers JDK and Android SDK install prompts
at the exact moment they appear, regardless of download duration.

Pipe approach fails because all buffered stdin is consumed immediately at
process start, leaving subsequent prompts unanswered when they appear
minutes later after downloads complete.
"""
import pty
import os
import select
import sys
import subprocess
import time

master_fd, slave_fd = pty.openpty()

proc = subprocess.Popen(
    ["bubblewrap", "build", "--skipPwaValidation"],
    stdin=slave_fd,
    stdout=slave_fd,
    stderr=slave_fd,
    close_fds=True,
)
os.close(slave_fd)

# JDK download ~2 min, Android SDK download ~5 min — each triggers a Y/n prompt.
# Android SDK also shows a license agreement prompt before downloading.
# Version info is already in twa-manifest.json so no version prompts appear.
prompts = [
    (b"install the JDK", b"Y\n"),
    (b"install the Android SDK", b"Y\n"),
    (b"Do you agree to the Android SDK terms", b"Yes\n"),
    (b"application versionName", b"1.0.0\n"),
    (b"application versionCode", b"1\n"),
]
idx = 0
buf = b""

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
        if idx < len(prompts):
            kw, ans = prompts[idx]
            if kw in buf:
                time.sleep(0.5)
                os.write(master_fd, ans)
                idx += 1
                buf = b""
    elif proc.poll() is not None:
        break

proc.wait()
print(f"\nbubblewrap exited with code {proc.returncode}", flush=True)
sys.exit(proc.returncode)
