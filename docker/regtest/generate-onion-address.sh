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
# TODO: fork of "https://github.com/Kexkey/vanitytorgen" - should be forked by jam org?
VANITYTORGEN_IMAGE="ghcr.io/theborakompanioni/vanitytorgen:v0.1.0"
VANITYTORGEN_DIGEST="sha256:b934d6d834c22882d268208ec9e2e6a101e0ef71ae0b626ffbd6420d3783fdcc"

# onion addresses are base32 - base32 alphabet allows letters [a-z] and digits [2-7]
PREFIX_CHARS="234567abcdefghijklmnopqrstuvwxyz" # "jam"

# choose a single random char
RANDOM_PREFIX_CHAR_INDEX=$(($RANDOM % ${#PREFIX_CHARS}))
ONION_ADDRESS_PREFIX="${PREFIX_CHARS:$RANDOM_PREFIX_CHAR_INDEX:1}"

echo "Will use prefix: ${ONION_ADDRESS_PREFIX}"

mkdir -p "${TARGETDIR}"

docker run --rm \
  --volume "${TARGETDIR}:/out:z" \
  --pull "missing" \
  "${VANITYTORGEN_IMAGE}@${VANITYTORGEN_DIGEST}" \
  "${ONION_ADDRESS_PREFIX}" /out
