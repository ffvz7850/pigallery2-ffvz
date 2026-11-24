#!/bin/bash
echo "=== 导出 1.3.2 ==="
docker save ffvz/pigallery2:1.3.2 -o /vol1/1000/docker/ffvz-pigallery2_1.3.2.tar
ls -lh /vol1/1000/docker/ffvz-pigallery2_1.3.2.tar
echo "=== 镜像清单 ==="
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep -E 'ffvz/pigallery2'
echo "=== 根证书（装设备用）==="
ls -l /vol1/1000/docker/pg2flow/config/caddy/data/caddy/pki/authorities/local/root.crt
echo "=== 磁盘 ==="
df -h /vol1 | tail -1
echo "=== 现网 8282 未改动确认 ==="
docker ps --format '{{.Names}} {{.Ports}}' | grep 8282 || echo "8282 不在本机容器中（在 fnos 应用侧）"
