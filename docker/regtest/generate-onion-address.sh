
#!/usr/bin/env bash

###
#
# This script will generate hostname, public and private keys
# to be used in a tor hidden service setup. The file will
# be placed in the given target directory or in a subdirectory
# of he current directory if not specified.
#
###

set -Eeuo pipefail
trap cleanup SIGINT SIGTERM ERR EXIT

cleanup() {
  trap - SIGINT SIGTERM ERR EXIT
  # script cleanup here
}

if ! command -v git &> /dev/null; then
    die "This script needs 'git' to run. Consider installing it."
fi
if ! command -v docker &> /dev/null; then
    die "This script needs 'docker' to run. Consider installing it."
fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

TARGETDIR="${1:-"${PWD}/generate-onion-address/out"}"
WORKDIR="${2:-"${PWD}/generate-onion-address/work"}"
VANITYTORGEN_REPO_DIR="${WORKDIR}/vanitytorgen"
# TODO: fork of "https://github.com/Kexkey/vanitytorgen" - should be forked by jam org?
VANITYTORGEN_REPO_URL="https://github.com/theborakompanioni/vanitytorgen"
VANITYTORGEN_REPO_BRANCH="main"
VANITYTORGEN_REPO_REF="85fa0c36208975f4e22bf10fb77b3d9bafb51979"

# onion addresses are base32 - base32 alphabet allows letters [a-z] and digits [2-7]
PREFIX_CHARS="234567abcdefghijklmnopqrstuvwxyz" # "jam"
PREFIX_CHAR_INDEX=$(($RANDOM % ${#PREFIX_CHARS}))
ONOION_ADDRESS_PREFIX="${PREFIX_CHARS:$PREFIX_CHAR_INDEX:1}"

echo "Will use prefix: ${ONOION_ADDRESS_PREFIX}"

mkdir -p "$TARGETDIR"
mkdir -p "$WORKDIR"

if ! [ -d "${VANITYTORGEN_REPO_DIR}" ]; then
    git clone "${VANITYTORGEN_REPO_URL}" "${VANITYTORGEN_REPO_DIR}" --branch "${VANITYTORGEN_REPO_BRANCH}" \
    && git --work-tree="${VANITYTORGEN_REPO_DIR}" --git-dir="${VANITYTORGEN_REPO_DIR}/.git" checkout "$VANITYTORGEN_REPO_REF"
    rm -rf "${VANITYTORGEN_REPO_DIR}/.git"
fi

docker build -t jam_regtest_vanitytorgen "${VANITYTORGEN_REPO_DIR}"
docker run --rm -v "$TARGETDIR:/out:z" jam_regtest_vanitytorgen "${ONOION_ADDRESS_PREFIX}" /out

TARGETDIR="${1:-"${PWD}"}"
WORKDIR="${2:-"${SCRIPT_DIR}/.tmp/generate-onion-address-work"}"
chown $(id -u):$(id -g) "${TARGETDIR}"
