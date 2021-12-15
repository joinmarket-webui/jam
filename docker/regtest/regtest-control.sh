#!/usr/bin/env bash

set -Eeuo pipefail
trap cleanup SIGINT SIGTERM ERR EXIT

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

usage() {
  cat <<EOF
Usage: regtest-control.sh [-h] [-v] [-w wallet_name] [-p password] [-m mixdepth] [-b blocks]

A helper script to fund your joinmarket regtest wallet.
Executed without parameters, it will mine a single block to wallet 'funded.jmdat' in mixdepth 0.
If the given wallet does not exist, it will be created.

Available options:
    -h, --help           Print this help and exit
    -v, --verbose        Print script debug info
    -w, --wallet-name    Wallet name (default: funded.jmdat)
    -p, --password       Wallet password (default: test)
    -m, --mixdepth       mixdepth used (0 - 4) (default: 0)
    -b, --blocks         amount of blocks (default: 1)

Examples:
    # Mine 42 blocks to wallet 'funded.jmdat' in mixdepth 0
    $(basename "${BASH_SOURCE[0]}") --blocks 42

    # Mine 5 blocks to wallet 'satoshi.jmdat' with password 'correctbatteryhorsestaple' in mixdepth 3
    $(basename "${BASH_SOURCE[0]}") --wallet-name satoshi.jmdat --mixdepth 3 --blocks 5 --password correctbatteryhorsestaple

EOF
  exit
}

cleanup() {
  trap - SIGINT SIGTERM ERR EXIT
  # script cleanup here
}

setup_colors() {
  if [[ -t 2 ]] && [[ -z "${NO_COLOR-}" ]] && [[ "${TERM-}" != "dumb" ]]; then
    NOFORMAT='\033[0m' RED='\033[0;31m' GREEN='\033[0;32m' ORANGE='\033[0;33m' BLUE='\033[0;34m' PURPLE='\033[0;35m' CYAN='\033[0;36m' YELLOW='\033[1;33m'
  else
    NOFORMAT='' RED='' GREEN='' ORANGE='' BLUE='' PURPLE='' CYAN='' YELLOW=''
  fi
}

msg() {
  echo >&2 -e "${1-}"
}

msg_success() {
  msg "${GREEN}${1-}${NOFORMAT}"
}

msg_error() {
  msg "${RED}${1-}${NOFORMAT}"
}

msg_highlight() {
  msg "${YELLOW}${1-}${NOFORMAT}"
}

die() {
  local code=${2-1} # default exit status 1
  msg_error "${1-}"
  exit "$code"
}

parse_params() {
  # default values of variables set from params
  wallet_password='test'
  wallet_name='funded.jmdat'
  mixdepth='0'
  blocks='1'
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

  return 0
}

setup_colors
parse_params "$@"

# ----------------------------------------

docker_container_running() {
  [ -z "${1-}" ] && die "docker_container_running: Missing required parameter: name"
  echo $(docker ps --filter "name=${1-}" --filter status=running -q)
}

msg "Trying to fund wallet $wallet_name.."

[ -z $(docker_container_running "jm_regtest_bitcoind") ] && die "Please make sure bitcoin container 'jm_regtest_bitcoind' is running."
[ -z $(docker_container_running "jm_regtest_joinmarket") ] && die "Please make sure joinmarket container 'jm_regtest_joinmarket' is running."

# --------------------------
# Verify no open session
# --------------------------
## API: /api/v1/session
## 
## Response:
## { 
##    "session": false, 
##    "maker_running": false, 
##    "coinjoin_in_process": false, 
##    "wallet_name": "None"
## }
##

# param "--insecure": Is needed because a self-signed certificate is used in joinmarket regtest container
# param "--silent": Don't show progress meter or error messages (errors are reactivated with "--show-error").
# param "--show-error": When used with -s, --silent, it makes curl show an error message if it fails.
if session_result=$(curl "$base_url/api/v1/session" --silent --show-error --insecure | jq "."); then
  msg_success "Successfully established connection to jmwalletd"
else rc=$?
  die "Could not connect to joinmarket. Please make sure jmwalletd is running inside container."
fi

[ $(jq -r '.session' <<< "$session_result") != "false" ] && die "Please make sure no session is active."
[ $(jq -r '.wallet_name' <<< "$session_result") != "None" ] && die "Please make sure no wallet is active."


# --------------------------
# Fetch all wallets
# --------------------------
## API: /api/v1/wallet/all
## 
## Response:
## {
##    "wallets": ["funded.jmdat", "test0.jmdat", "test1.jmdat", "test2.jmdat"]
## }
##
wallet_all_result=$(curl "$base_url/api/v1/wallet/all" --silent --show-error --insecure | jq ".")
available_wallets=$(jq -r '.wallets' <<< "$wallet_all_result")

msg "Available wallets: $available_wallets"

target_wallet_index=$(echo "$available_wallets" | jq -r "index(\"$wallet_name\")")
target_wallet_exists=$( [ "$target_wallet_index" = "null" ] ; echo $? )

if [ "$target_wallet_exists" = "1" ]; then
    # --------------------------
    # Unlock existing wallet
    # --------------------------
    msg "Wallet $wallet_name already exists - unlocking.."

    ## API: /api/v1/wallet/$wallet_name/unlock
    ## 
    ## Response:
    ## {
    ##    "walletname": "funded.jmdat", 
    ##    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    ## }
    unlock_request_payload="{\"password\":\"$wallet_password\"}"

    unlock_result=$(curl "$base_url/api/v1/wallet/$wallet_name/unlock" --silent --show-error --insecure --data $unlock_request_payload | jq ".")

    unlock_result_error_msg=$(jq -r '. | select(.message != null) | .message' <<< "$unlock_result")
    if [ "$unlock_result_error_msg" != "" ]; then 
        die "$unlock_result_error_msg"
    fi

    auth_token=$(jq -r '.token' <<< "$unlock_result")

    msg_success "Successfully unlocked wallet $wallet_name."
else
    # --------------------------
    # Create new wallet
    # --------------------------
    msg "Wallet $wallet_name does not exist - creating.."

    ## API: /api/v1/wallet/create
    ## 
    ## Response:
    ## {
    ##    "walletname": "funded.jmdat", 
    ##    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...", 
    ##    "seedphrase": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    ## }
    ## or (if wallet already exists):
    ## {
    ##  "message": "Wallet file cannot be overwritten."
    ## }
    ##
    create_request_payload="{\"password\":\"$wallet_password\",\"walletname\":\"$wallet_name\",\"wallettype\":\"sw-fb\"}"

    create_result=$(curl "$base_url/api/v1/wallet/create" --silent --show-error --insecure --data $create_request_payload | jq ".")

    create_result_error_msg=$(jq -r '. | select(.message != null) | .message' <<< "$create_result")
    if [ "$create_result_error_msg" != "" ]; then 
        die "$create_result_error_msg"
    fi

    seedphrase=$(jq -r '.seedphrase' <<< "$create_result")
    auth_token=$(jq -r '.token' <<< "$create_result")

    msg_success "Successfully created wallet $wallet_name."
    msg_highlight "Write down the seedphrase: $seedphrase"
fi

[ -z "$auth_token" ] && die "No auth token found."

auth_header="Authorization: Bearer $auth_token"


# --------------------------
# Fetch new address
# --------------------------
## API: /api/v1/wallet/$wallet_name/address/new/$mixdepth
## 
## Response:
## {
##  "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
## }
msg "Fetching new funding address from wallet $wallet_name in mixdepth $mixdepth"  
address_result=$(curl "$base_url/api/v1/wallet/$wallet_name/address/new/$mixdepth" --silent --show-error --insecure -H "$auth_header" | jq ".")

address=$(jq -r '.address' <<< "$address_result")

if [ "$address" = "null" ]; then 
    # just print an error message -> wallet must be locked before we can exit
    msg_error "No address found - aborting."
else 
    msg_success "Successfully fetched new funding address $address"
fi


# --------------------------
# Lock wallet
# --------------------------
## API: /api/v1/wallet/$wallet_name/lock
## 
## Response:
## {
##  "walletname": "funded.jmdat",
##  "already_locked": false
## }
msg "Locking wallet $wallet_name"
lock_result=$(curl "$base_url/api/v1/wallet/$wallet_name/lock" --silent --show-error --insecure -H "$auth_header" | jq ".")

locked_wallet_name=$(jq -r '.walletname' <<< "$lock_result")
[ "$locked_wallet_name" != "$wallet_name" ] && die "Problem while locking wallet $wallet_name"

msg_success "Successfully locked wallet $wallet_name."

# In case an address could not be fetched, exit hard now.
[ "$address" = "null" ] && die "No address found."


# --------------------------
# Mine the actual blocks
# --------------------------
# generate new blocks with rewards in wallet
msg "Generating $blocks blocks with rewards to $address"
btcd_generatetoaddress_result=$(docker exec -t jm_regtest_bitcoind bitcoin-cli --datadir=/data generatetoaddress $blocks $address)

# make the generated coinbase spendable (not mining the new coinbases to an address controlled by the wallet on purpose!)
btcd_generate_result=$(docker exec -t jm_regtest_bitcoind bitcoin-cli --datadir=/data -generate 100)

msg_success "Successfully generated $blocks blocks with rewards to $address"
