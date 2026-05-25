#!/bin/bash
cd "$(dirname "$0")"
echo "上野清掃2.3 v2-3 を起動します: http://localhost:9300/"
echo "停止するには Ctrl+C を押してください"
python3 -m http.server 9300 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null' EXIT INT TERM
sleep 1
open "http://localhost:9300/"
wait "$SERVER_PID"
