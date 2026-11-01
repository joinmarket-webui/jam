#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)
REPO_ROOT=$(cd "${SCRIPT_DIR}/../.." &>/dev/null && pwd -P)
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.smoke.yml"
ENV_FILE="${SCRIPT_DIR}/.env.smoke"
PROJECT_NAME="jam-smoke"

die() {
  local code=${2-1}
  echo >&2 -e "[smoke-setup] ERROR: ${1-}"
  exit "$code"
}

# Compose interpolates the whole file even for logs/down. Use the generated
# directory address consistently, including after a partially failed startup.
compose() {
  if [ -f "${ENV_FILE}" ]; then
    docker compose -p "${PROJECT_NAME}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
  else
    JM_ALL_DIRECTORY_NODES=unused.onion:5222 JM_NG_DIRECTORY_NODES=unused.onion:5222 \
      docker compose -p "${PROJECT_NAME}" -f "${COMPOSE_FILE}" "$@"
  fi
}

wait_for_bitcoind() {
  for ((attempt=0; attempt<30; attempt++)); do
    if compose exec -T bitcoind bitcoin-cli -datadir=/home/bitcoin/data -regtest -rpcport=43782 -rpcuser=regtest -rpcpassword=regtest getblockchaininfo &>/dev/null; then
      return 0
    fi
    sleep 2
  done
  die "bitcoind RPC did not become ready."
}

wait_for_jmwalletd() {
  for ((attempt=0; attempt<30; attempt++)); do
    if curl --fail --silent --show-error --insecure --connect-timeout 2 --max-time 5 https://127.0.0.1:28183/api/v1/session &>/dev/null; then
      return 0
    fi
    sleep 2
  done
  die "jmwalletd session API did not become ready."
}

# Makers (and a minimal maker count for the taker) are only needed by the regression suite:
# `smoke-setup.sh up --with-makers`. `down` and `logs` always include them.
MAKER_API_PORTS=(29183 29184 29185)
MAKER_WALLET_NAME="maker.jmdat"
MAKER_WALLET_PASSWORD="maker"
# any valid regtest address not controlled by a wallet of the environment
BURN_ADDRESS="bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk"

mine_blocks() {
  compose exec -T bitcoind bitcoin-cli -datadir=/home/bitcoin/data -regtest -rpcport=43782 -rpcuser=regtest -rpcpassword=regtest \
    generatetoaddress "$1" "$2" >/dev/null
}

wait_for_api() {
  local port=$1
  for ((attempt=0; attempt<30; attempt++)); do
    if curl --fail --silent --insecure --connect-timeout 2 --max-time 5 "https://127.0.0.1:${port}/api/v1/session" &>/dev/null; then
      return 0
    fi
    sleep 2
  done
  die "jmwalletd API on port ${port} did not become ready."
}

# Create and fund a maker wallet - prints the auth token of the maker wallet.
fund_maker() {
  local port=$1
  local base_url="https://127.0.0.1:${port}/api/v1"
  wait_for_api "${port}"

  local create_result token address
  create_result=$(curl --fail --silent --show-error --insecure -X POST "${base_url}/wallet/create" \
    -H "Content-Type: application/json" \
    --data "{\"walletname\":\"${MAKER_WALLET_NAME}\",\"password\":\"${MAKER_WALLET_PASSWORD}\"}")
  token=$(jq -r '.token' <<< "${create_result}")
  if [ -z "${token}" ] || [ "${token}" = "null" ]; then
    die "Could not create maker wallet on port ${port}."
  fi

  address=$(curl --fail --silent --show-error --insecure -H "Authorization: Bearer ${token}" \
    "${base_url}/wallet/${MAKER_WALLET_NAME}/address/new/0" | jq -r '.address')
  if [ -z "${address}" ] || [ "${address}" = "null" ]; then
    die "Could not fetch maker address on port ${port}."
  fi

  mine_blocks 10 "${address}"
  echo "${token}"
}

start_maker() {
  local port=$1 token=$2
  local result
  result=$(curl --fail --silent --show-error --insecure -X POST \
    "https://127.0.0.1:${port}/api/v1/wallet/${MAKER_WALLET_NAME}/maker/start" \
    -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \
    --data '{"txfee":"0","cjfee_a":"0","cjfee_r":"0.0003","ordertype":"sw0absoffer","minsize":"1"}')
  if [ "$(jq -c '.' <<< "${result}")" != "{}" ]; then
    die "Could not start maker on port ${port}: ${result}"
  fi
}

# Makers reach the directory node via its onion service, which can take a few minutes to become reachable.
wait_for_offers() {
  local expected=$1 count=0
  for ((attempt=0; attempt<150; attempt++)); do
    count=$(curl --silent --max-time 5 http://127.0.0.1:31800/orderbook.json | jq '.offers | length' 2>/dev/null || echo 0)
    if [ "${count:-0}" -ge "${expected}" ]; then
      echo "[smoke-setup] Found ${count} offers after $((attempt * 2))s."
      return 0
    fi
    sleep 2
  done
  die "Orderbook contains ${count:-0} offers - expected at least ${expected}."
}

setup_makers() {
  local tokens=() token
  for port in "${MAKER_API_PORTS[@]}"; do
    echo "[smoke-setup] Creating and funding maker wallet on port ${port}..."
    token=$(fund_maker "${port}")
    tokens+=("${token}")
  done

  echo "[smoke-setup] Mining blocks to mature the coinbase outputs of the makers..."
  mine_blocks 100 "${BURN_ADDRESS}"

  for i in "${!MAKER_API_PORTS[@]}"; do
    echo "[smoke-setup] Starting maker on port ${MAKER_API_PORTS[$i]}..."
    start_maker "${MAKER_API_PORTS[$i]}" "${tokens[$i]}"
  done

  echo "[smoke-setup] Waiting for maker offers in the orderbook..."
  wait_for_offers "${#MAKER_API_PORTS[@]}"
  echo "[smoke-setup] Makers are ready."
}

action="${1:-up}"
with_makers=false
if [ "${2:-}" = "--with-makers" ]; then
  with_makers=true
elif [ -n "${2:-}" ]; then
  die "Unknown option: ${2}. Use '--with-makers'."
fi

if [ "$action" = "up" ]; then
  echo "[smoke-setup] Preparing smoke environment in ${SCRIPT_DIR}..."

  NG_HS_TARGET_DIR="${SCRIPT_DIR}/out/ng_directory_hidden_service"
  if [ ! -f "${NG_HS_TARGET_DIR}/hostname" ]; then
    echo "[smoke-setup] Generating onion address for directory node..."
    mkdir -p "${NG_HS_TARGET_DIR}"
    bash "${REPO_ROOT}/docker/regtest/generate-onion-address.sh" "${NG_HS_TARGET_DIR}"
  fi

  NG_ONION_ADDRESS=$(cat "${NG_HS_TARGET_DIR}/hostname")
  if ! [[ "${NG_ONION_ADDRESS}" == *.onion ]]; then
    die "Invalid onion address generated: ${NG_ONION_ADDRESS}"
  fi

  cat <<EOF > "${ENV_FILE}"
JM_NG_DIRECTORY_NODES=${NG_ONION_ADDRESS}:5222
JM_ALL_DIRECTORY_NODES=${NG_ONION_ADDRESS}:5222
EOF

  if [ "${with_makers}" = true ]; then
    echo "COMPOSE_PROFILES=makers" >> "${ENV_FILE}"
    # the api requires at least 2 counterparties - more makers than needed for some slack
    echo "JM_TAKER_MINIMUM_MAKERS=2" >> "${ENV_FILE}"
  fi

  echo "[smoke-setup] Starting isolated containers with compose project '${PROJECT_NAME}'..."
  compose up --detach --wait --wait-timeout 180

  echo "[smoke-setup] Waiting for bitcoind RPC..."
  wait_for_bitcoind
  echo "[smoke-setup] bitcoind RPC is ready."

  echo "[smoke-setup] Waiting for jmwalletd API..."
  wait_for_jmwalletd
  echo "[smoke-setup] jmwalletd API is ready."

  if [ "${with_makers}" = true ]; then
    setup_makers
  fi

  echo "[smoke-setup] Smoke environment successfully initialized."

elif [ "$action" = "down" ]; then
  echo "[smoke-setup] Tearing down isolated compose project '${PROJECT_NAME}'..."
  compose --profile makers down --volumes --remove-orphans
  rm -rf "${SCRIPT_DIR}/out" "${ENV_FILE}"
  echo "[smoke-setup] Teardown complete."

elif [ "$action" = "logs" ]; then
  compose --profile makers logs --tail 200

else
  die "Unknown action: ${action}. Use 'up', 'down', or 'logs'."
fi
