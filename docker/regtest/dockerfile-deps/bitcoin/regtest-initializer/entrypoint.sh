#!/bin/sh
set -Eeuo pipefail

if [ -f "${READY_FILE}" ]; then
    echo "Removing $READY_FILE..."
    rm -f "${READY_FILE}"
    echo "Removed $READY_FILE."
fi

source /usr/local/bin/wait-for-bitcoind.sh
source /usr/local/bin/mine-blocks.sh

if [ "${READY_FILE}" ] && [ ! -f "${READY_FILE}" ]; then
    echo "Creating $READY_FILE..."
    echo "1" > "${READY_FILE}"
    echo "Created $READY_FILE."
fi
