#!/usr/bin/env bash

set -Eeuo pipefail

die() {
  local code=${2-1} # default exit status 1
  echo >&2 -e "${1-}"
  exit "$code"
}

BLOCKS=${1:-1} # default to mine a single block
ADDRESS=${2:-bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx} # default to a "random" address

[ -z "${BLOCKS//[\-0-9]}" ] || die "Invalid parameter: 'blocks' must be an integer"
[ "$BLOCKS" -ge 1 ] || die "Invalid parameter: 'blocks' must be a positve integer"

docker exec -t jm_regtest_bitcoind bitcoin-cli -regtest -rpcport=43782 -datadir=/data generatetoaddress $BLOCKS $ADDRESS