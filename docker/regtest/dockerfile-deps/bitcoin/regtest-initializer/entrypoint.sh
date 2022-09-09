#!/bin/sh
set -Eeuo pipefail

export _BTC_USER="${RPC_USER}:${RPC_PASSWORD}"
export _BTC_URL="http://${RPC_HOST}:${RPC_PORT}"

if [ -f "${READY_FILE}" ]; then
    echo "Removing $READY_FILE..."
    rm -f "${READY_FILE}"
    echo "Removed $READY_FILE."
fi

MINE_BLOCKS=101

source /usr/local/bin/wait-for-bitcoind.sh
source /usr/local/bin/mine-blocks.sh "${MINE_BLOCKS}"
source /usr/local/bin/wait-for-blocks.sh "${MINE_BLOCKS}"

if [ "${READY_FILE}" ] && [ ! -f "${READY_FILE}" ]; then
    echo "Creating $READY_FILE..."
    echo "1" > "${READY_FILE}"
    echo "Created $READY_FILE."
fi
