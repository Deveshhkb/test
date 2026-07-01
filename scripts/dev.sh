#!/usr/bin/env bash
# Start backend (5000), frontend (3000) and admin (3001) together.
# Press Ctrl+C once to stop all three.
set -e
trap 'echo; echo "Stopping all dev servers..."; kill 0' EXIT

npm run dev:backend &
npm run dev:frontend &
npm run dev:admin &
wait
