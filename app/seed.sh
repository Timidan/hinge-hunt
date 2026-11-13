#!/bin/sh
# Publish a verified mechanism as a live round: ./seed.sh <id> <zip> "<object name>"  (run from app/)
# ZIPs go into KV as 20 MB chunks (KV's per-value limit is 25 MB). Add the id to list:live yourself.
set -e
tmp=$(mktemp -d); split -b 20000000 -d -a 1 "$2" "$tmp/c"
n=0; for c in "$tmp"/c*; do npx wrangler kv key put --remote --binding KV "file:$1:zip:$n" --path "$c"; n=$((n+1)); done
npx wrangler kv key put --remote --binding KV "file:$1:zipn" "$n"
npx wrangler kv key put --remote --binding KV "round:$1" "{\"id\":\"$1\",\"status\":\"live\",\"created\":$(date +%s)000,\"seed\":true,\"name\":\"$3\"}"
rm -r "$tmp"
