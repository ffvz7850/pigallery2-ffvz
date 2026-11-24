#!/bin/bash
# 1.3.24 = 时序参数定值版（只动前端 dist，后端 js 沿用 1.3.23 那套）
#
# 变更内容：
#   - 删 FADE_MS / FAST_FADE_MS 两个常量 + --vf-fade / --vf-fast-fade 两个 CSS 变量
#     + `.vf-root.vf-instant` 规则 + 模板 [class.vf-instant]（实测该规则命中 0 次，死代码）
#   - 淡入固定 0.2s（M3 duration-short4 = fade 令牌）写进 CSS，不再由 TS 下发
#   - FAST_RATE 1.2 / FAST_SETTLE_MS 200 / RESIZE_SETTLE_MS 140 定值不动，补推导注释
#   - applyTuningStyles() → applyVoidColor()（只下发 --vf-void）
set -e
BASE=ffvz/pigallery2:flat-1315
D=/vol1/1000/docker/pg2flow
B=$D/https
TC=/vol1/1000/docker/pyxin/tmp
V=1.3.24

if [ ! -d "$D/dist/en" ]; then echo "ERROR: dist missing"; exit 2; fi
for F in ClientConfig.js MemoryPreviewMWs.js ThumbnailGeneratorMWs.js GalleryRouter.js; do
  if [ ! -f "$B/$F" ]; then echo "ERROR: $F missing in build context"; exit 3; fi
done
grep -q flowLowEnabled "$B/ClientConfig.js" || (echo "ERROR: ClientConfig.js 里没有 flowLowEnabled"; exit 4)

# 这一版的反向断言：旧调参痕迹必须搜不到
if grep -rq 'vf-instant' "$D/dist/zh"; then echo "ERROR: vf-instant 没删干净"; exit 5; fi
if grep -rq 'vf-fast-fade' "$D/dist/zh"; then echo "ERROR: vf-fast-fade 没删干净"; exit 6; fi
grep -rq 'vf-fade-in .2s' "$D/dist/zh" || (echo "ERROR: 淡入时长没进产物"; exit 7)

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
echo "=== 产物自检（容器内）==="
docker exec pigallery2flow sh -c 'echo -n "vf-instant="; grep -o "vf-instant" /app/dist/zh/*.js | wc -l; echo -n "fade.2s="; grep -o "vf-fade-in .2s" /app/dist/zh/*.js | wc -l'
echo "=== 镜像 ==="
docker images --format '{{.Repository}}:{{.Tag}}\t{{.Size}}' | grep -E 'pigallery2:'
docker exec pigallery2flow cat /app/dist/pg2flow-build.txt
df -h /vol1 | tail -1
