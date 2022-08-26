#!/bin/sh
set -Eeuo pipefail

BLOCKS=${1:-101} # default to mine a single block
ADDRESS=${2:-bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx} # default to a "random" address

echo "Mining blocks..."
payload="{\
    \"jsonrpc\":\"1.0\",\
    \"id\":\"curl\",\
    \"method\":\"generatetoaddress\",\
    \"params\":[${BLOCKS},\"${ADDRESS}\"]\
}"
curl --silent --user "${_BTC_USER}" --data-binary "${payload}" "${_BTC_URL}" > /dev/null 2>&1
