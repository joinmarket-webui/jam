#!/bin/sh
set -eu

BLOCKS=${1:-0} # wait for x amount of blocks

echo "Waiting for bitcoind to report at least ${BLOCKS} blocks..."
payload="{\
	\"jsonrpc\":\"1.0\",\
	\"id\":\"curl\",\
	\"method\":\"getblockchaininfo\",\
	\"params\":[]\
}"
# Bound the wait to at most 20 requests of 2 seconds plus 19 one-second pauses.
attempt=1
while [ "${attempt}" -le 20 ]; do
    if response=$(curl --fail --silent --connect-timeout 2 --max-time 2 \
        --user "${_BTC_USER}" --data-binary "${payload}" "${_BTC_URL}") &&
        printf '%s' "${response}" | jq -es --argjson minimum "${BLOCKS}" '
            length == 1 and (.[0] |
                .error == null and (.result.blocks | type == "number" and . >= $minimum))
        ' >/dev/null 2>&1; then
        echo "Successfully waited for ${BLOCKS} blocks to be reported."
        exit 0
    fi
    if [ "${attempt}" -lt 20 ]; then sleep 1; fi
    attempt=$((attempt + 1))
done
echo "Timed out waiting for Bitcoin Core getblockchaininfo to report at least ${BLOCKS} blocks." >&2
exit 1
