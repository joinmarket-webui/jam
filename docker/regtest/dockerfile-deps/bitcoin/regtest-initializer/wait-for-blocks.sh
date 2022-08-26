#!/bin/sh
set -Eeuo pipefail

BLOCKS=${1:-0} # wait for x amount of blocks

echo "Waiting for bitcoind to report at least ${BLOCKS} blocks..."
payload="{\
	\"jsonrpc\":\"1.0\",\
	\"id\":\"curl\",\
	\"method\":\"getblockchaininfo\",\
	\"params\":[]\
}"
until curl --silent --user "${_BTC_USER}" --data-binary "${payload}" "${_BTC_URL}" | jq -e ".result.blocks >= ${BLOCKS}" > /dev/null 2>&1
do
	echo -n "."
	sleep 1
done
