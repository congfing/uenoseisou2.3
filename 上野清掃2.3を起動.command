#!/bin/bash

cd "$(dirname "$0")" || exit 1

PORT=9300
URL="http://localhost:${PORT}/"

if curl -fsS "$URL" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT" &
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT" &
elif command -v ruby >/dev/null 2>&1; then
  ruby -run -e httpd . -p "$PORT" &
elif command -v php >/dev/null 2>&1; then
  php -S "localhost:${PORT}" &
else
  osascript -e 'display alert "上野清掃2.3を起動できません" message "Python 3、Ruby、PHPのいずれかが必要です。管理者へ連絡してください。" as critical'
  exit 1
fi

SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null' EXIT INT TERM
sleep 1

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  osascript -e 'display alert "上野清掃2.3を起動できません" message "9300番ポートを確認してください。" as critical'
  exit 1
fi

echo "上野清掃2.3を起動しました: $URL"
echo "この画面を閉じると停止します。"
open "$URL"
wait "$SERVER_PID"
