#!/bin/bash
# 1.3.23 = 清理版：参数固化成常量 + 删诊断面板/localStorage 覆盖/Server-Timing/死档位
#
# 这一版前后端都动了：ClientConfig（删 3 个设置项）、MemoryPreviewMWs（删 Server-Timing 与
# 1080/1440 档位）、vertical-flow 组件（删诊断层）。dist 全量替换。
set -e
BASE=ffvz/pigallery2:flat-1315
D=/vol1/1000/docker/pg2flow
B=$D/https
TC=/vol1/1000/docker/pyxin/tmp
V=1.3.23

if [ ! -d "$D/dist/en" ]; then echo "ERROR: dist missing"; exit 2; fi
for F in ClientConfig.js MemoryPreviewMWs.js ThumbnailGeneratorMWs.js GalleryRouter.js; do
  if [ ! -f "$B/$F" ]; then echo "ERROR: $F missing in build context"; exit 3; fi
done
grep -c flowLowEnabled "$B/ClientConfig.js" || (echo "ERROR: ClientConfig.js 里没有 flowLowEnabled"; exit 4)
# 清理版：这三个应该已经不存在了
if grep -q 'Server-Timing' "$B/MemoryPreviewMWs.js"; then echo "ERROR: Server-Timing 没删干净"; exit 5; fi
if grep -q 'flowDebug' "$B/ClientConfig.js"; then echo "ERROR: flowDebug 没删干净"; exit 6; fi
if grep -q 'flowPreviewEdge' "$B/ClientConfig.js"; then echo "ERROR: flowPreviewEdge 没删干净"; exit 7; fi

rm -rf "$B/dist"
cp -a "$D/dist" "$B/dist"
echo "=== 精简语言包（保留 zh / en）==="
for L in $(ls "$B/dist"); do
  case "$L" in
    zh|en|pg2flow-build.txt) ;;
    *) rm -rf "$B/dist/$L" ;;
  esac
done
du -sh "$B/dist"

cat > "$B/Dockerfile" <<DOCKER
FROM $BASE
COPY ClientConfig.js /app/src/common/config/public/ClientConfig.js
COPY MemoryPreviewMWs.js /app/src/backend/middlewares/thumbnail/MemoryPreviewMWs.js
COPY ThumbnailGeneratorMWs.js /app/src/backend/middlewares/thumbnail/ThumbnailGeneratorMWs.js
COPY GalleryRouter.js /app/src/backend/routes/GalleryRouter.js
COPY dist /app/dist
RUN echo "pg2flow-$V" > /app/dist/pg2flow-build.txt
EXPOSE 80 443
DOCKER

cd "$B"
docker rmi "ffvz/pigallery2:$V" >/dev/null 2>&1 || true
echo "=== build ==="
docker build -t "ffvz/pigallery2:$V" . 2>&1 | tail -3

docker rm -f pigallery2flow >/dev/null 2>&1 || true
docker run -d --name pigallery2flow \
  -e NODE_ENV=production -e TZ=Asia/Shanghai -e PUID=1000 -e PGID=1001 \
  -e Photo_photoLoadMethod=Original -e PG2_TLS_HOST=192.168.0.10 \
  -e default-Database-dbFolder=/app/data/db \
  -e default-Media-folder=/app/data/images \
  -e default-Media-tempFolder=/app/data/tmp \
  -e default-Extensions-folder=/app/data/config/extensions \
  -e PI_DOCKER=true \
  -v "$D/config":/app/data/config \
  -v "$D/data":/app/data/db \
  -v "/vol2/1000/图库/photo":/app/data/images:ro \
  -v "$TC":/app/data/tmp \
  -p 8285:80 -p 8286:443 --restart unless-stopped "ffvz/pigallery2:$V"
sleep 16
docker ps --filter name=pigallery2flow --format '{{.Status}} | {{.Image}}'
curl -sk -o /dev/null -w 'https c=%{http_code}\n' https://127.0.0.1:8286/
echo "=== 新字段是否进配置（服务端应下发 flowLowEnabled / flowPreGen=2）==="
docker exec pigallery2flow sh -c 'echo -n "flowLowEnabled="; grep -c flowLowEnabled /app/src/common/config/public/ClientConfig.js; echo -n "残留Server-Timing="; grep -c "Server-Timing" /app/src/backend/middlewares/thumbnail/MemoryPreviewMWs.js || true'
echo "=== 首页注入的配置（截 flow 段）==="
curl -sk https://127.0.0.1:8286/ | grep -o 'flow[A-Za-z]*":[^,]*' | head -10
echo "=== 镜像 ==="
docker images --format '{{.Repository}}:{{.Tag}}\t{{.Size}}' | grep -E 'pigallery2:'
docker exec pigallery2flow cat /app/dist/pg2flow-build.txt
df -h /vol1 | tail -1
