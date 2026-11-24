#!/bin/bash
# 1.3.22 = 预热与「加载 720 底图」解耦（无底图模式也预热，但跳过挂载窗口避免重复生成）
#
# 这一版只动了前端（vertical-flow 组件 .ts 的 startPreGen + ClientConfig 文案），
# 后端四个 js 沿用 1.3.19 的产物；dist 全量替换，后端 COPY 不动。
set -e
BASE=ffvz/pigallery2:flat-1315
D=/vol1/1000/docker/pg2flow
B=$D/https
TC=/vol1/1000/docker/pyxin/tmp
V=1.3.22

if [ ! -d "$D/dist/en" ]; then echo "ERROR: dist missing"; exit 2; fi
for F in ClientConfig.js MemoryPreviewMWs.js ThumbnailGeneratorMWs.js GalleryRouter.js; do
  if [ ! -f "$B/$F" ]; then echo "ERROR: $F missing in build context"; exit 3; fi
done
grep -c flowLowEnabled "$B/ClientConfig.js" || (echo "ERROR: ClientConfig.js 里没有 flowLowEnabled"; exit 4)
grep -c 'Server-Timing' "$B/MemoryPreviewMWs.js" || (echo "ERROR: MemoryPreviewMWs.js 里没有 Server-Timing"; exit 5)

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
docker exec pigallery2flow sh -c 'grep -c flowLowEnabled /app/src/common/config/public/ClientConfig.js; grep -c "x-pg2-pregen" /app/src/backend/middlewares/thumbnail/MemoryPreviewMWs.js'
echo "=== 首页注入的配置（截 flow 段）==="
curl -sk https://127.0.0.1:8286/ | grep -o 'flow[A-Za-z]*":[^,]*' | head -10
echo "=== 镜像 ==="
docker images --format '{{.Repository}}:{{.Tag}}\t{{.Size}}' | grep -E 'pigallery2:'
docker exec pigallery2flow cat /app/dist/pg2flow-build.txt
df -h /vol1 | tail -1
