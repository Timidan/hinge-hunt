#!/bin/sh
# Publish verified mechanisms as live rounds: ./seed.sh <id>=<zip> ...  (run from app/)
set -e
ids=""
for pair in "$@"; do
  id=${pair%%=*}; zip=${pair#*=}
  npx wrangler kv key put --remote --binding KV "file:$id:zip" --path "$zip"
  npx wrangler kv key put --remote --binding KV "round:$id" "{\"id\":\"$id\",\"status\":\"live\",\"created\":$(date +%s)000,\"seed\":true}"
  ids="$ids\"$id\","
done
npx wrangler kv key put --remote --binding KV "list:live" "[${ids%,}]"
