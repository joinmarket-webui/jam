#!/bin/bash
set -e

pushd . > /dev/null
cd /src
. jmvenv/bin/activate
popd > /dev/null

if [[ "$1" == "unlockwallet" ]]; then
    shift 1
    if ! [ -f "${ENV_FILE}" ]; then
        echo "You need to initialize the wallet.
        jm.sh wallet-tool-generate
        jm.sh set-wallet <wallet_name> <Password>"
        exit 1
    fi
    export $(cat "$ENV_FILE" | xargs)
    if [[ "$1" == "nopass" ]]; then
        shift 1
        COMMAND="$1"
        shift 1
        $COMMAND "${WALLET_NAME}" "$@"
    else
        COMMAND="$1"
        shift 1
        echo -n "${WALLET_PASS}" | $COMMAND --wallet-password-stdin "${WALLET_NAME}" "$@"
    fi
else
    exec "$@"
fi



