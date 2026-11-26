"""Run the local website and API together from one terminal."""

import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen
import webbrowser


ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"


def available_port(preferred):
    with socket.socket() as probe:
        try:
            probe.bind((HOST, preferred))
        except OSError:
            probe.bind((HOST, 0))
        return probe.getsockname()[1]


def check_children(children):
    for child in children:
        if child.poll() is not None:
            raise RuntimeError(f"{child.args[0]} exited with code {child.returncode}. See the log above.")


def wait_for(url, children):
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        check_children(children)
        try:
            with urlopen(url, timeout=3) as response:
                if response.status == 200:
                    return
        except (URLError, TimeoutError, ConnectionError):
            pass
        time.sleep(0.4)
    raise RuntimeError(f"Timed out waiting for {url}")


def main():
    api_port = available_port(8001)
    web_port = available_port(3001)
    api = f"http://{HOST}:{api_port}"
    site = f"http://{HOST}:{web_port}"
    page = site + "/check-plant"
    env = dict(os.environ, NEXT_PUBLIC_REKOLT_API_URL=api, CORS_ORIGINS=site,
               REKOLT_LOCAL_WEB_PORT=str(web_port))
    children = []
    try:
        for command, ready in [
            ([sys.executable, "-m", "uvicorn", "backend.app.main:app",
              "--host", HOST, "--port", str(api_port)], api + "/api/v1/health"),
            (["node", "node_modules/vinext/dist/cli.js", "dev",
              "--hostname", HOST, "--port", str(web_port)], page),
        ]:
            children.append(subprocess.Popen(command, cwd=ROOT, env=env))
            wait_for(ready, children)
        print(f"Dokter Plant is ready at {page}. Press Ctrl+C here to stop.", flush=True)
        webbrowser.open(page)
        while True:
            check_children(children)
            time.sleep(0.5)
    finally:
        for child in reversed(children):
            if child.poll() is None:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(child.pid), "/T", "/F"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    child.terminate()
                child.wait()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except (OSError, RuntimeError) as error:
        sys.exit(str(error))
