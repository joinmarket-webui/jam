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
  docker compose -p "${PROJECT_NAME}" --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up --detach --wait --wait-timeout 180

  echo "[smoke-setup] Waiting for bitcoind RPC..."
  for i in $(seq 1 30); do
    if docker compose -p "${PROJECT_NAME}" -f "${COMPOSE_FILE}" exec -T bitcoind bitcoin-cli -datadir=/home/bitcoin/data -regtest -rpcport=43782 -rpcuser=regtest -rpcpassword=regtest getblockchaininfo &>/dev/null; then
      echo "[smoke-setup] bitcoind RPC is ready."
      break
    fi
    sleep 2
  done

  echo "[smoke-setup] Waiting for jmwalletd API..."
  for i in $(seq 1 30); do
    if curl -s -k https://127.0.0.1:28183/api/v1/session &>/dev/null; then
      echo "[smoke-setup] jmwalletd API is ready."
      break
    fi
    sleep 2
  done

  echo "[smoke-setup] Smoke environment successfully initialized."

elif [ "$action" = "down" ]; then
  echo "[smoke-setup] Tearing down isolated compose project '${PROJECT_NAME}'..."
  docker compose -p "${PROJECT_NAME}" -f "${COMPOSE_FILE}" down --volumes --remove-orphans || true
  rm -rf "${SCRIPT_DIR}/out" "${ENV_FILE}" || true
  echo "[smoke-setup] Teardown complete."

elif [ "$action" = "logs" ]; then
  docker compose -p "${PROJECT_NAME}" -f "${COMPOSE_FILE}" logs --tail 200

else
  die "Unknown action: ${action}. Use 'up', 'down', or 'logs'."
fi
