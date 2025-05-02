#!/usr/bin/env bash

###
#
# This script will generate keys and hostname to be used in a tor hidden
# service setup. The output files are placed in a given target directory
# or in a subdirectory of the current working directory if not specified.
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
VANITYTORGEN_REPO_REF="f497346ab540153f06edabe65df37ae5536a2d9a"

# onion addresses are base32 - base32 alphabet allows letters [a-z] and digits [2-7]
PREFIX_CHARS="234567abcdefghijklmnopqrstuvwxyz" # "jam"

# choose a single random char
RANDOM_PREFIX_CHAR_INDEX=$(($RANDOM % ${#PREFIX_CHARS}))
ONION_ADDRESS_PREFIX="${PREFIX_CHARS:$RANDOM_PREFIX_CHAR_INDEX:1}"

echo "Will use prefix: ${ONION_ADDRESS_PREFIX}"

mkdir -p "$TARGETDIR"
mkdir -p "$WORKDIR"

# download "vanitygen" repo if necessary
if ! [ -d "${VANITYTORGEN_REPO_DIR}" ]; then
    git clone "${VANITYTORGEN_REPO_URL}" "${VANITYTORGEN_REPO_DIR}" --branch "${VANITYTORGEN_REPO_BRANCH}" \
        && git --work-tree="${VANITYTORGEN_REPO_DIR}" --git-dir="${VANITYTORGEN_REPO_DIR}/.git" checkout "$VANITYTORGEN_REPO_REF" \
        && rm -rf "${VANITYTORGEN_REPO_DIR}/.git"
fi

# build and run "vanitygen" docker container
docker build --tag jam_regtest_vanitytorgen "${VANITYTORGEN_REPO_DIR}"
docker run --rm --volume "$TARGETDIR:/out:z" jam_regtest_vanitytorgen "${ONION_ADDRESS_PREFIX}" /out
