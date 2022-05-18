#!/usr/bin/env bash

###
#
# This script prepares the regtest environment.
#
# The output of this script is a ".env.generated" file
# to be used in when running docker-compose.
# e.g. 
# ```
# docker-compose --env-file .env.generated --file docker-compose.yml up
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

# generate an onion address
HS_SCRIPT_TARGET_DIR="${SCRIPT_DIR}/out/hidden_service_dir"
HS_SCRIPT_WORK_DIR="${SCRIPT_DIR}/.tmp/generate-onion-address-work"
. "$SCRIPT_DIR/generate-onion-address.sh" "${HS_SCRIPT_TARGET_DIR}" "${HS_SCRIPT_WORK_DIR}"


ONION_ADDRESS=`cat ${HS_SCRIPT_TARGET_DIR}/hostname`

if ! [[ "${ONION_ADDRESS}" == *.onion ]]; then
  die "Invalid argument: Could not find onion address in ${HS_SCRIPT_TARGET_DIR}/hostname"
fi

ONION_ADDRESS_WITH_PORT="${ONION_ADDRESS}:5222"

cat <<EOF > "${OUTPUT_FILE}"
JM_DIRECTORY_NODES=${ONION_ADDRESS_WITH_PORT}

EOF

echo "Successfully written to ${OUTPUT_FILE}"
