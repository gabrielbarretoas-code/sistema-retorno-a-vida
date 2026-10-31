"""Check the published public assets against this exact release; no private API access."""
import concurrent.futures
import hashlib
import json
import pathlib
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIGIN = "https://gabrielbarretoas-code.github.io"
PREFIX = "/sistema-retorno-a-vida/"
FILES = ("index.html", "app.html", "app.js", "app.css", "workspace.js", "workspace.css",
         "mentor.js", "mentor.css", "context-base.js", "context-base.css", "system-shell.js", "system-shell.css")
EXPECTED = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in FILES}
DEADLINE = time.monotonic() + 240


class SameOrigin(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, "Unexpected redirect", headers, fp)


def check(name):
    request = urllib.request.Request(ORIGIN + PREFIX + name, headers={"Cache-Control": "no-cache"})
    try:
        remaining = DEADLINE - time.monotonic()
        if remaining <= 0:
            return {"file": name, "matches": False, "error": "deadline"}
        with urllib.request.build_opener(SameOrigin).open(request, timeout=min(15, remaining)) as response:
            data = response.read(2 * 1024 * 1024 + 1)
            digest = hashlib.sha256(data).hexdigest()
            return {"file": name, "status": response.status, "bytes": len(data), "sha256": digest,
                    "matches": len(data) <= 2 * 1024 * 1024 and digest == EXPECTED[name]}
    except urllib.error.HTTPError as error:
        return {"file": name, "status": error.code, "matches": False}
    except (OSError, TimeoutError) as error:
        return {"file": name, "matches": False, "error": type(error).__name__}


if __name__ == "__main__":
    while True:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(check, FILES))
        if all(item["matches"] for item in results):
            print(json.dumps({"publishedAssetsVerified": True, "files": results}))
            break
        if time.monotonic() >= DEADLINE:
            print(json.dumps({"publishedAssetsVerified": False, "files": results}))
            raise SystemExit(1)
        time.sleep(min(10, max(0, DEADLINE - time.monotonic())))
