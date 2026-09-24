#!/bin/sh
set -e
cd /workspace
if curl -sf -o /dev/null http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev > /tmp/dev-server.log 2>&1 &
i=0
while [ "$i" -lt 40 ]; do
  if curl -sf -o /dev/null http://127.0.0.1:8080/; then
    exit 0
  fi
  i=$((i + 1))
  sleep 0.5
done
echo "dev server did not become healthy" >&2
tail -n 80 /tmp/dev-server.log >&2 || true
exit 1
