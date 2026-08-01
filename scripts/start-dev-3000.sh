#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="${HOME}/.nvm"
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"

cd /home/rakeem/Repos/sword

fuser -k 3000/tcp >/dev/null 2>&1 || true
fuser -k 3001/tcp >/dev/null 2>&1 || true

setsid npx next dev --turbopack -H 0.0.0.0 -p 3000 \
  >/tmp/sword-dev.log 2>&1 </dev/null &

echo "PID=$!"
sleep 5

echo "---- log ----"
tail -n 40 /tmp/sword-dev.log || true
echo "---- listen ----"
ss -ltn | grep 3000 || true
echo "---- curl ----"
curl -sS -I --max-time 8 http://127.0.0.1:3000/ | head -n 8 || true
