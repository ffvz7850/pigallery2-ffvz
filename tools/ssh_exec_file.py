# -*- coding: utf-8 -*-
"""上传本地 .sh 脚本到 NAS 并执行。用法: python ssh_exec_file.py <local_script.sh>"""
import sys
import paramiko

HOST = "192.168.0.10"
PORT = 223
USER = "ghbvzz"
PASSWORD = "FFVz7850191."


def main():
    local = sys.argv[1]
    remote = "/tmp/cmd_" + local.split("\\")[-1].replace(".", "_") + ".sh"
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=20)
    sftp = client.open_sftp()
    sftp.put(local, remote)
    sftp.close()
    # 用 sudo 执行
    cmd = f"echo '{PASSWORD}' | sudo -S bash {remote}"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    client.exec_command(f"rm -f {remote}")
    client.close()
    print(out, end="")
    if err:
        print("[STDERR]", err, end="", file=sys.stderr)
    sys.exit(code)


if __name__ == "__main__":
    main()
