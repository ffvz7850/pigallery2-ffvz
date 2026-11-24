# -*- coding: utf-8 -*-
"""SSH 执行辅助脚本：在飞牛 NAS 上执行命令，输出 stdout/stderr。"""
import sys
import paramiko

HOST = "192.168.0.10"
PORT = 223
USER = "ghbvzz"
PASSWORD = "FFVz7850191."


def exec_cmd(cmd: str, timeout: int = 300) -> tuple:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=20)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    client.close()
    return code, out, err


if __name__ == "__main__":
    cmd = sys.argv[1]
    code, out, err = exec_cmd(cmd)
    print(out, end="")
    if err:
        print("[STDERR]", err, end="", file=sys.stderr)
    sys.exit(code)
