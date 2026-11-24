# -*- coding: utf-8 -*-
"""递归上传本地 dist 到 NAS 的构建目录（paramiko SFTP）。"""
import os
import stat
import sys
import paramiko

HOST = "192.168.0.10"
PORT = 223
USER = "ghbvzz"
PASSWORD = "FFVz7850191."

LOCAL = os.environ.get(
    "PG2_DIST", r"D:\PCAPP\DBAO\pigallery2-build\pigallery2-3.5.2\dist"
)
REMOTE = "/vol1/1000/docker/pg2flow/dist"


def connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    return c


def ensure_dir(sftp, path: str) -> None:
    parts = [p for p in path.split("/") if p]
    cur = ""
    for p in parts:
        cur += "/" + p
        try:
            sftp.stat(cur)
        except IOError:
            sftp.mkdir(cur)


def rm_tree(sftp, path: str) -> None:
    try:
        entries = sftp.listdir_attr(path)
    except IOError:
        return
    for e in entries:
        p = path + "/" + e.filename
        if stat.S_ISDIR(e.st_mode):
            rm_tree(sftp, p)
            sftp.rmdir(p)
        else:
            sftp.remove(p)


def main() -> int:
    if not os.path.isdir(LOCAL):
        print("no local dist")
        return 1
    clean = "--clean" in sys.argv
    client = connect()
    sftp = client.open_sftp()
    if clean:
        print("cleaning remote dist...")
        rm_tree(sftp, REMOTE)
    count = 0
    total = 0
    for root, dirs, files in os.walk(LOCAL):
        rel = os.path.relpath(root, LOCAL).replace(os.sep, "/")
        remote_dir = REMOTE if rel == "." else REMOTE + "/" + rel
        ensure_dir(sftp, remote_dir)
        for f in files:
            lp = os.path.join(root, f)
            rp = remote_dir + "/" + f
            sftp.put(lp, rp)
            count += 1
            total += os.path.getsize(lp)
    sftp.close()
    client.close()
    print("uploaded %d files, %.1f MB" % (count, total / 1e6))
    return 0


if __name__ == "__main__":
    sys.exit(main())
