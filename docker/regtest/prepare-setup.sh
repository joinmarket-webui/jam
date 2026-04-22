#!/usr/bin/env bash

###
#
# This script prepares the regtest environment.
#
# The output of this script is a ".env.generated" file
# to be used in when running `docker compose`.
# e.g. 
# ```
# docker compose --env-file .env.generated --file docker-compose.yml up
# ```
#
###

set -Eeuo pipefail

die() {
  local code=${2-1} # default exit status 1
  echo >&2 -e "${1-}"
  exit "$code"
}

if ! command -v cat &> /dev/null; then
    die "This script needs 'cat' to run. Consider installing it."
fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

OUTPUT_FILE="$SCRIPT_DIR/.env.generated"

# generate onion address for legacy joinmarket-clientserver directory node
REF_HS_SCRIPT_TARGET_DIR="${SCRIPT_DIR}/out/hidden_service_dir"
. "$SCRIPT_DIR/generate-onion-address.sh" "${REF_HS_SCRIPT_TARGET_DIR}"

REF_ONION_ADDRESS=$(cat "${REF_HS_SCRIPT_TARGET_DIR}/hostname")

if ! [[ "${REF_ONION_ADDRESS}" == *.onion ]]; then
  die "Invalid argument: Could not find onion address in ${REF_HS_SCRIPT_TARGET_DIR}/hostname"
fi

# generate onion address for JoinMarket NG directory node (served via external Tor)
NG_HS_SCRIPT_TARGET_DIR="${SCRIPT_DIR}/out/ng_directory_hidden_service"
. "$SCRIPT_DIR/generate-onion-address.sh" "${NG_HS_SCRIPT_TARGET_DIR}"

NG_ONION_ADDRESS=$(cat "${NG_HS_SCRIPT_TARGET_DIR}/hostname")

if ! [[ "${NG_ONION_ADDRESS}" == *.onion ]]; then
  die "Invalid argument: Could not find onion address in ${NG_HS_SCRIPT_TARGET_DIR}/hostname"
fi

REFERENCE_DIRECTORY_NODE_ADDRESS="${REF_ONION_ADDRESS}:5222"
NG_DIRECTORY_NODE_ADDRESS="${NG_ONION_ADDRESS}:5222"
ALL_DIRECTORY_NODE_ADDRESSES="${REFERENCE_DIRECTORY_NODE_ADDRESS},${NG_DIRECTORY_NODE_ADDRESS}"

cat <<EOF > "${OUTPUT_FILE}"
JM_REF_DIRECTORY_NODES=${REFERENCE_DIRECTORY_NODE_ADDRESS}
JM_NG_DIRECTORY_NODES=${NG_DIRECTORY_NODE_ADDRESS}
JM_ALL_DIRECTORY_NODES=${ALL_DIRECTORY_NODE_ADDRESSES}

EOF

echo "Successfully written to ${OUTPUT_FILE}"
