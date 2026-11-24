#!/bin/bash
# 1.3.2 = 1.3.1 + 视频海报预热（视频项也走预载+解码，首帧不再黑块）
# 仍从 1.1.6 一次成型，避免镜像层叠加膨胀
set -e
D=/vol1/1000/docker/pg2flow
B=$D/https

if [ ! -d "$D/dist/en" ]; then echo "ERROR: dist missing"; exit 2; fi

cat > "$B/Dockerfile" <<'DOCKER'
FROM caddy:2-alpine AS caddysrc
FROM ffvz/pigallery2:1.1.6
COPY --from=caddysrc /usr/bin/caddy /usr/local/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /usr/local/bin/pg2-entrypoint
# 先清空再 COPY：否则基础镜像里上一代的 *main.<hash>.js 会残留，
# 出现多个 main bundle（自检时 grep 到旧包会误判版本）
RUN rm -rf /app/dist
COPY dist /app/dist
RUN chmod +x /usr/local/bin/pg2-entrypoint \
 && echo "pg2flow-1.3.2" > /app/dist/pg2flow-build.txt
EXPOSE 80 443
ENTRYPOINT ["/usr/local/bin/pg2-entrypoint"]
DOCKER

rm -rf "$B/dist"
cp -a "$D/dist" "$B/dist"

cd "$B"
docker rmi ffvz/pigallery2:1.3.2 >/dev/null 2>&1 || true
echo "=== build ==="
docker build -t ffvz/pigallery2:1.3.2 . 2>&1 | tail -6

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
  -v "$D/tmp":/app/data/tmp \
  -p 8285:80 -p 8286:443 --restart unless-stopped ffvz/pigallery2:1.3.2
sleep 12
echo "=== images ==="
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep pigallery
echo "=== ps ==="
docker ps --filter name=pigallery2flow --format '{{.Status}} | {{.Ports}}'
echo "=== http / https ==="
curl -s -o /dev/null -w 'http  v=%{http_version} c=%{http_code}\n' http://127.0.0.1:8285/
curl -sk -o /dev/null -w 'https v=%{http_version} c=%{http_code}\n' https://127.0.0.1:8286/
echo "=== bundle 校验（zh 主包）==="
BB=$(docker exec pigallery2flow sh -c 'ls /app/dist/zh/zh.main.*.js')
echo "bundle=$BB"
docker exec pigallery2flow sh -c "for k in warmPoster onPosterLoad posterDecoded; do printf '%-14s %s\n' \$k \$(grep -o \$k $BB | wc -l); done"
cat /app/dist/pg2flow-build.txt 2>/dev/null || docker exec pigallery2flow cat /app/dist/pg2flow-build.txt
