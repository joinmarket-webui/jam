#!/bin/sh
set -eu

BLOCKS=${1:-101} # default to mine 101 blocks
ADDRESS=${2:-bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx} # default to a "random" address

echo "Mining ${BLOCKS} blocks to address ${ADDRESS}..."
payload="{\
    \"jsonrpc\":\"1.0\",\
    \"id\":\"curl\",\
    \"method\":\"generatetoaddress\",\
    \"params\":[${BLOCKS},\"${ADDRESS}\"]\
}"
if ! response=$(curl --fail --silent --show-error --connect-timeout 2 --max-time 60 \
    --user "${_BTC_USER}" --data-binary "${payload}" "${_BTC_URL}"); then
    echo "Bitcoin Core generatetoaddress RPC request failed." >&2
    exit 1
fi

if ! printf '%s' "${response}" | jq -es --argjson expected "${BLOCKS}" '
    length == 1 and (.[0] |
        .error == null and (.result |
            type == "array" and length == $expected and
            all(.[]; type == "string" and test("^[0-9a-fA-F]{64}$"))))
' >/dev/null; then
    echo "Bitcoin Core generatetoaddress did not return ${BLOCKS} block hashes." >&2
    exit 1
fi

echo "Successfully mined ${BLOCKS} blocks to address ${ADDRESS}."
