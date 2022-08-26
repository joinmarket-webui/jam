#!/bin/sh
set -Eeuo pipefail

btcuser="regtest:regtest"
btchost="http://bitcoind:43782"

echo "Mining blocks..."
curl --silent --user "${btcuser}" --data-binary '{"jsonrpc": "1.0", "id": "curl", "method": "generatetoaddress", "params": [101, "bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx"]}' -H 'content-type: text/plain;' "${btchost}" > /dev/null 2>&1
