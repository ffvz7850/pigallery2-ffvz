#!/bin/bash
echo "=== index.html 引用 ==="
docker exec pigallery2flow sh -c 'grep -o "zh.main[^\"]*js" /app/dist/zh/index.html'
echo "=== zh 目录里的 js ==="
docker exec pigallery2flow sh -c 'ls /app/dist/zh/*.js | xargs -n1 basename'
echo "=== 是否有其它旧主包（非 index 引用的）==="
docker exec pigallery2flow sh -c 'ls /app/dist/zh/zh.main.*.js | wc -l'
echo "=== 新包里关键字（逐个查）==="
docker exec pigallery2flow sh -c 'for f in /app/dist/zh/zh.main.*.js; do printf "%s warmPoster=%s\n" "$(basename $f)" "$(grep -o warmPoster $f | wc -l)"; done'
