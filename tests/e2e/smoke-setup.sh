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

action="${1:-up}"

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

  echo "[smoke-setup] Starting isolated containers with compose project '${PROJECT_NAME}'..."
  compose up --detach --wait --wait-timeout 180

  echo "[smoke-setup] Waiting for bitcoind RPC..."
  wait_for_bitcoind
  echo "[smoke-setup] bitcoind RPC is ready."

  echo "[smoke-setup] Waiting for jmwalletd API..."
  wait_for_jmwalletd
  echo "[smoke-setup] jmwalletd API is ready."

  echo "[smoke-setup] Smoke environment successfully initialized."

elif [ "$action" = "down" ]; then
  echo "[smoke-setup] Tearing down isolated compose project '${PROJECT_NAME}'..."
  compose down --volumes --remove-orphans
  rm -rf "${SCRIPT_DIR}/out" "${ENV_FILE}"
  echo "[smoke-setup] Teardown complete."

elif [ "$action" = "logs" ]; then
  compose logs --tail 200

else
  die "Unknown action: ${action}. Use 'up', 'down', or 'logs'."
fi
