#!/usr/bin/env bash

set -Eeuo pipefail
trap cleanup SIGINT SIGTERM ERR EXIT

cleanup() {
  trap - SIGINT SIGTERM ERR EXIT
  # script cleanup here
}

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

. "$script_dir/common.sh"

usage() {
  cat <<EOF
Usage: fund-wallet.sh [-h] [-v] [-w wallet_name] [-p password] [-m mixdepth] [-b blocks]

A helper script to fund your joinmarket regtest wallet.
Executed without parameters, it will mine a single block to wallet 'Satoshi.jmdat' in mixdepth 0.
If the given wallet does not exist, it will be created.

Available options:
    -h, --help           Print this help and exit
    -v, --verbose        Print script debug info
    -w, --wallet-name    Wallet name (default: Satoshi.jmdat)
    -p, --password       Wallet password (default: test)
    -m, --mixdepth       Mixdepth used (0 - 4) (default: 0)
    -b, --blocks         Amount of blocks (default: 1)
    -um, --unmatured     Disable block reward maturity (coins will not be spendable immediately)
    -c, --container      Target container (default: jm_regtest_joinmarket)

Examples:
    # Mine 42 blocks to wallet 'Satoshi.jmdat' in mixdepth 0
    $(basename "${BASH_SOURCE[0]}") --blocks 42

    # Mine 5 blocks to wallet 'Satoshi.jmdat' with password 'correctbatteryhorsestaple' in mixdepth 3
    $(basename "${BASH_SOURCE[0]}") --wallet-name 'Satoshi\'s Wallet.jmdat' --mixdepth 3 --blocks 5 --password correctbatteryhorsestaple

    # Mine one block (unmatured) to wallet 'Satoshi.jmdat' of container 'jm_regtest_joinmarket2'
    $(basename "${BASH_SOURCE[0]}") --container jm_regtest_joinmarket2 --unmatured

EOF
  exit
}

parse_params() {
  # default values of variables set from params
  wallet_password='test'
  wallet_name='Satoshi.jmdat'
  mixdepth='0'
  blocks='1'
  unmatured=false
  container='jm_regtest_joinmarket'
  base_url='https://localhost:28183'

  while :; do
    case "${1-}" in
    -h | --help) usage ;;
    -v | --verbose) set -x ;;
    --no-color) NO_COLOR=1 ;;
    -p | --password)
      wallet_password="${2-}"
      shift
      ;;
    -w | --wallet-name)
      wallet_name="${2-}"
      shift
      ;;
    -m | --mixdepth)
      mixdepth="${2-}"
      shift
      ;;
    -b | --blocks)
      blocks="${2-}"
      shift
      ;;
    -um | --unmatured) unmatured=true ;;
    -c | --container)
      container="${2-}"
      shift
      ;;
    -?*) die "Unknown option: $1" ;;
    *) break ;;
    esac
    shift
  done

  args=("$@")

  # check required params
  [ -z "${wallet_name-}" ] && die "Missing required parameter: 'wallet-name'"
  [[ "${wallet_name-}" != *".jmdat" ]] && die "Invalid parameter: 'wallet-name' must end with '.jmdat'"

  [ -z "${wallet_password-}" ] && die "Missing required parameter: 'password'"

  [ -z "${mixdepth-}" ] && die "Missing required parameter: 'mixdepth'"
  [ -z "${mixdepth//[\-0-9]}" ] || die "Invalid parameter: 'mixdepth' must be an integer"
  [ "$mixdepth" -ge 0 ] && [ "$mixdepth" -le 4 ] || die "Invalid parameter: 'mixdepth' must be in range 0..4"

  [ -z "${blocks-}" ] && die "Missing required parameter: 'blocks'"
  [ -z "${blocks//[\-0-9]}" ] || die "Invalid parameter: 'blocks' must be an integer"
  [ "$blocks" -ge 1 ] || die "Invalid parameter: 'blocks' must be a positve integer"

  [ "$container" == "jm_regtest_joinmarket" ] || 
  [ "$container" == "jm_regtest_joinmarket2" ] ||
  [ "$container" == "jm_regtest_joinmarket3" ] || 
  die "Invalid parameter: 'container' must be a known container name"

  [ "$container" == "jm_regtest_joinmarket" ] && base_url='https://localhost:28183'
  [ "$container" == "jm_regtest_joinmarket2" ] && base_url='https://localhost:29183'
  [ "$container" == "jm_regtest_joinmarket3" ] && base_url='https://localhost:30183'

  return 0
}

parse_params "$@"

# ----------------------------------------

msg "Trying to fund wallet '$wallet_name'.."

[ -z "$(is_docker_container_running "jm_regtest_bitcoind")" ] && die "Please make sure bitcoin container 'jm_regtest_bitcoind' is running."
[ -z "$(is_docker_container_running "$container")" ] && die "Please make sure joinmarket container '$container' is running."


verify_no_open_session_or_throw "$base_url"

# --------------------------
# Fetch available wallets
# --------------------------
available_wallets=$(fetch_available_wallets "$base_url")

msg "Available wallets: $available_wallets"

target_wallet_index=$(echo "$available_wallets" | jq -r "index(\"$wallet_name\")")
target_wallet_exists=$( [ "$target_wallet_index" = "null" ] ; echo $? )

if [ "$target_wallet_exists" = "1" ]; then
    # --------------------------
    # Unlock existing wallet
    # --------------------------
    msg "Wallet '$wallet_name' already exists - unlocking.."

    unlock_result=$(unlock_wallet "$base_url" "$wallet_name" "$wallet_password")

    auth_token=$(jq -r '.token' <<< "$unlock_result")

    msg_success "Successfully unlocked wallet '$wallet_name'."
else
    # --------------------------
    # Create new wallet
    # --------------------------
    msg "Wallet '$wallet_name' does not exist - creating.."

    create_result=$(create_wallet "$base_url" "$wallet_name" "$wallet_password")

    seedphrase=$(jq -r '.seedphrase' <<< "$create_result")
    auth_token=$(jq -r '.token' <<< "$create_result")

    msg_success "Successfully created wallet '$wallet_name'."
    msg_highlight "Write down the seedphrase: $seedphrase"
fi

[ -z "$auth_token" ] && die "No auth token found."

auth_header="Authorization: Bearer $auth_token"


# --------------------------
# Fetch new address
# --------------------------
msg "Fetching new funding address from wallet '$wallet_name' in mixdepth $mixdepth"

address=$(fetch_new_address "$base_url" "$auth_header" "$wallet_name" "$mixdepth")

if [ "$address" = "null" ]; then
    # just print an error message -> wallet must be locked before we can exit
    msg_error "No address found - aborting."
else
    msg_success "Successfully fetched new funding address $address"
fi


# --------------------------
# Lock wallet
# --------------------------
msg "Locking wallet '$wallet_name'"

lock_result=$(lock_wallet "$base_url" "$auth_header" "$wallet_name")

msg_success "Successfully locked wallet '$wallet_name'."

# In case an address could not be fetched, exit hard now.
[ "$address" = "null" ] && die "No address found."


# --------------------------
# Mine the actual blocks
# --------------------------
# generate new blocks with rewards to wallet
msg "Generating $blocks blocks with rewards to $address"
. "$script_dir/mine-block.sh" "$blocks" "$address" &>/dev/null

if [ "$unmatured" = true ]; then
  msg_warn "Block rewards are not yet matured and will not be immediately spendable"
else
    msg "Generating another 100 blocks to make block rewards spendable.."
    # make the generated coinbase spendable (not mining the new coinbases to an address controlled by the wallet on purpose!)
    . "$script_dir/mine-block.sh" 100 &>/dev/null
fi

msg_success "Successfully generated $blocks blocks with rewards to $address"
