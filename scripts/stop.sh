#!/usr/bin/env bash
# Kill anything listening on the dev ports.
for port in 5000 3000 3001; do
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    echo "Stopped port $port"
  fi
done
echo "All dev servers stopped."
