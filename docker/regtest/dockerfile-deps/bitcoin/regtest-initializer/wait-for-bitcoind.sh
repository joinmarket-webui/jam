#!/bin/sh
set -Eeuo pipefail

btcuser="regtest:regtest"
btchost="http://bitcoind:43782"

echo "Waiting for bitcoind to start..."
until curl --silent --user "${btcuser}" --data-binary '{"jsonrpc": "1.0", "id": "curl", "method": "getblockchaininfo", "params": []}' -H 'content-type: text/plain;' "${btchost}" | jq -e ".result.blocks >= 0" > /dev/null 2>&1
do
	echo -n "."
	sleep 1
done
