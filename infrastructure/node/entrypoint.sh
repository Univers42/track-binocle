#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  exec sleep infinity
fi

exec "$@"
