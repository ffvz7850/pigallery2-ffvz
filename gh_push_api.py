# -*- coding: utf-8 -*-
"""用 GitHub Git Data API 把本地目录推送为一个 commit（支持断点续传、限流退避）。"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

TOKEN = open(r"D:\PCAPP\DBAO\GONGJU\github-token-ffvz7850.txt", encoding="utf-8").read().strip()
REPO = "ffvz7850/pigallery2-ffvz"
SRC = r"D:\PCAPP\DBAO\pigallery2-lightbox\1.3.24"
MAP_FILE = os.path.join(SRC, "blob_map.json")
MSG = "PiGallery2 1.3.24: 时序参数定稿 + 代码清理（基于 3.5.2 定制）"
TAG = "v1.3.24"

HEADERS = {
    "Authorization": "Bearer %s" % TOKEN,
    "User-Agent": "doubao",
    "Accept": "application/vnd.github+json",
}


def api(method, path, payload=None, timeout=300):
    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        "https://api.github.com" + path,
        data=data,
        method=method,
        headers={**HEADERS, "Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def skip(rel):
    p = rel.replace("\\", "/")
    if "/node_modules/" in "/" + p + "/" or p.startswith("node_modules/"):
        return True
    if p.endswith(".js.map"):
        return True
    if "/dist/" in "/" + p or p.startswith("dist/"):
        return True
    if "/release/" in "/" + p or p.startswith("release/"):
        return True
    if p.startswith("src/src/") and p.endswith(".js"):
        return True
    return False


def collect():
    out = []
    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "dist", "release")]
        for fn in files:
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, SRC)
            if skip(rel):
                continue
            out.append((rel.replace("\\", "/"), full))
    return out


def make_blob(item):
    rel, full = item
    with open(full, "rb") as f:
        raw = f.read()
    b64 = base64.b64encode(raw).decode("ascii")
    wait = 5
    last = None
    for attempt in range(6):
        try:
            r = api("POST", "/repos/%s/git/blobs" % REPO, {"content": b64, "encoding": "base64"}, timeout=600)
            return rel, r["sha"], len(raw)
        except urllib.error.HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", errors="replace")[:300]
            except Exception:
                pass
            last = "HTTP %d %s" % (e.code, body)
            if e.code in (403, 429):
                ra = e.headers.get("Retry-After")
                time.sleep(int(ra) if ra and ra.isdigit() else wait)
                wait = min(wait * 2, 60)
                continue
            time.sleep(2 * (attempt + 1))
        except Exception as e:
            last = "%s: %s" % (type(e).__name__, e)
            time.sleep(3 * (attempt + 1))
    return rel, None, last


def main():
    files = collect()
    print("待上传文件: %d 个" % len(files), flush=True)

    done_map = {}
    if os.path.exists(MAP_FILE):
        with open(MAP_FILE, encoding="utf-8") as f:
            done_map = json.load(f)
        print("已有进度: %d 个" % len(done_map), flush=True)

    todo = [x for x in files if x[0] not in done_map]
    print("待补齐: %d 个" % len(todo), flush=True)

    t0 = time.time()
    failed = []
    lock_n = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for rel, sha, info in pool.map(make_blob, todo):
            lock_n += 1
            if sha:
                done_map[rel] = sha
            else:
                failed.append((rel, info))
            if lock_n % 25 == 0 or lock_n == len(todo):
                with open(MAP_FILE, "w", encoding="utf-8") as f:
                    json.dump(done_map, f, ensure_ascii=False)
                print("  进度 %d/%d  %.0fs  失败 %d" % (lock_n, len(todo), time.time() - t0, len(failed)), flush=True)

    with open(MAP_FILE, "w", encoding="utf-8") as f:
        json.dump(done_map, f, ensure_ascii=False)

    if failed:
        print("仍有 %d 个失败:" % len(failed), flush=True)
        for rel, info in failed[:10]:
            print("  %s -> %s" % (rel, info), flush=True)
        return 1

    print("全部 blob 就绪: %d 个" % len(done_map), flush=True)
    tree_items = [{"path": rel, "mode": "100644", "type": "blob", "sha": sha} for rel, sha in done_map.items()]
    print("创建 tree（%d 项）..." % len(tree_items), flush=True)
    tree = api("POST", "/repos/%s/git/trees" % REPO, {"tree": tree_items}, timeout=300)
    print("  tree: %s" % tree["sha"], flush=True)

    head = api("GET", "/repos/%s/git/ref/heads/main" % REPO)
    base_sha = head["object"]["sha"]
    commit = api(
        "POST",
        "/repos/%s/git/commits" % REPO,
        {"message": MSG, "tree": tree["sha"], "parents": [base_sha]},
    )
    print("  commit: %s" % commit["sha"], flush=True)

    api("PATCH", "/repos/%s/git/refs/heads/main" % REPO, {"sha": commit["sha"], "force": False})
    print("  main 已更新", flush=True)

    try:
        api("POST", "/repos/%s/git/refs" % REPO, {"ref": "refs/tags/%s" % TAG, "sha": commit["sha"]})
        print("  tag %s 已创建" % TAG, flush=True)
    except urllib.error.HTTPError as e:
        if e.code == 422:
            print("  tag 已存在，跳过", flush=True)
        else:
            raise

    print("COMMIT_SHA=%s" % commit["sha"], flush=True)
    with open(os.path.join(SRC, "commit_sha.txt"), "w", encoding="ascii") as f:
        f.write(commit["sha"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
