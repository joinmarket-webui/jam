#!/bin/bash
set -e

WALLET_NAME="$1"
WALLET_PASS="$2"
if ! [[ "$WALLET_NAME" ]] || ! [[ "$WALLET_PASS" ]]; then
    echo "Usage: set-wallet <wallet_name> <password>"
    exit 1
fi
echo "WALLET_NAME=$WALLET_NAME" > "$ENV_FILE"
echo "WALLET_PASS=$WALLET_PASS" >> "$ENV_FILE"

exec wallet-tool.sh
