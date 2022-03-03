#!/usr/bin/env bash

# A script containing many useful functions and common operations. 
# This file is suitable for sourcing into other scripts.

setup_colors() {
  if [[ -t 2 ]] && [[ -z "${NO_COLOR-}" ]] && [[ "${TERM-}" != "dumb" ]]; then
    NOFORMAT='\033[0m' RED='\033[0;31m' GREEN='\033[0;32m' ORANGE='\033[0;33m' BLUE='\033[0;34m' PURPLE='\033[0;35m' CYAN='\033[0;36m' YELLOW='\033[1;33m'
  else
    NOFORMAT='' RED='' GREEN='' ORANGE='' BLUE='' PURPLE='' CYAN='' YELLOW=''
  fi
}

# setup colors to enable using `msg_*` functions immediately
setup_colors

msg() {
  echo >&2 -e "${1-}"
}

msg_success() {
  msg "${GREEN}${1-}${NOFORMAT}"
}

msg_warn() {
  msg "${ORANGE}${1-}${NOFORMAT}"
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

### Check if dependencies are installed.
################################################################################
if ! command -v curl &> /dev/null; then
    die "This script needs 'curl' to run. Consider installing it."
fi
if ! command -v jq &> /dev/null; then
    die "This script needs 'jq' to run. Consider installing it."
fi
if ! command -v docker &> /dev/null; then
    die "This script needs 'docker' to run. Consider installing it."
fi

is_docker_container_running() {
  [ -z "${1-}" ] && die "is_docker_container_running: Missing required parameter: name"
  local result; result=$(docker ps --filter "name=^/${1-}$" --filter status=running -q)
  echo "$result"
}

# --------------------------
# Unlock existing wallet
# --------------------------
## API: POST /api/v1/wallet/$wallet_name/unlock
## 
## Response: 
## 200 OK
## {
##    "walletname": "funded.jmdat", 
##    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
## }
unlock_wallet() {
    local base_url; base_url=${1:-}
    local wallet_name; wallet_name=${2:-}
    local wallet_password; wallet_password=${3:-}
    local unlock_request_payload; unlock_request_payload="{\"password\":\"$wallet_password\"}"

    # param "--insecure": Is needed because a self-signed certificate is used in joinmarket regtest container
    # param "--silent": Don't show progress meter or error messages (errors are reactivated with "--show-error").
    # param "--show-error": When used with -s, --silent, it makes curl show an error message if it fails.
    local unlock_result; unlock_result="$(curl "$base_url/api/v1/wallet/$wallet_name/unlock" --silent --show-error --insecure --data "$unlock_request_payload" | jq ".")"

    local unlock_result_error_msg; unlock_result_error_msg=$(jq -r '. | select(.message != null) | .message' <<< "$unlock_result")
    if [ "$unlock_result_error_msg" != "" ]; then
        die "$unlock_result_error_msg"
    fi

    echo "$unlock_result"
}

# --------------------------
# Lock wallet
# --------------------------
## API: GET /api/v1/wallet/$wallet_name/lock
## 
## Response: 
## 200 OK
## {
##  "walletname": "funded.jmdat",
##  "already_locked": false
## }
lock_wallet() {
    local base_url; base_url=${1:-}
    local auth_header; auth_header=${2:-}
    local wallet_name; wallet_name=${3:-}
    
    local lock_result; lock_result=$(curl "$base_url/api/v1/wallet/$wallet_name/lock" --silent --show-error --insecure -H "$auth_header" | jq ".")

    local locked_wallet_name; locked_wallet_name=$(jq -r '.walletname' <<< "$lock_result")
    [ "$locked_wallet_name" != "$wallet_name" ] && die "Problem while locking wallet $wallet_name"

    echo "$lock_result"
}

# --------------------------
# Create new wallet
# --------------------------
## API: POST /api/v1/wallet/create
## 
## Response: 
## 200 OK
## {
##    "walletname": "funded.jmdat", 
##    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...", 
##    "seedphrase": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
## }
## or (if wallet already exists):
## 409 Conflict
## {
##  "message": "Wallet file cannot be overwritten."
## }
create_wallet() {
    local base_url; base_url=${1:-}
    local wallet_name; wallet_name=${2:-}
    local wallet_password; wallet_password=${3:-}
    local create_request_payload; create_request_payload="{\"password\":\"$wallet_password\",\"walletname\":\"$wallet_name\",\"wallettype\":\"sw-fb\"}"

    local create_result; create_result="$(curl "$base_url/api/v1/wallet/create" --silent --show-error --insecure --data "$create_request_payload" | jq ".")"

    local create_result_error_msg; create_result_error_msg=$(jq -r '. | select(.message != null) | .message' <<< "$create_result")
    if [ "$create_result_error_msg" != "" ]; then
        die "$create_result_error_msg"
    fi

    echo "$create_result"
}

# --------------------------
# Fetch new address
# --------------------------
## API: GET /api/v1/wallet/$wallet_name/address/new/$mixdepth
## 
## Response:
## 200 OK
## {
##  "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
## }
fetch_new_address() {
    local base_url; base_url=${1:-}
    local auth_header; auth_header=${2:-}
    local wallet_name; wallet_name=${3:-}
    local mixdepth; mixdepth=${4:-}

    local address_result; address_result=$(curl "$base_url/api/v1/wallet/$wallet_name/address/new/$mixdepth" --silent --show-error --insecure -H "$auth_header" | jq ".")

    local address; address=$(jq -r '.address' <<< "$address_result")

    echo "$address"
}

# --------------------------
# Fetch available wallets
# --------------------------
## API: GET /api/v1/wallet/all
## 
## Response:
## 200 OK
## {
##    "wallets": ["funded.jmdat", "test0.jmdat", "test1.jmdat", "test2.jmdat"]
## }
##
fetch_available_wallets() {
    local base_url; base_url=${1:-}

    local wallet_all_result; wallet_all_result="$(curl "$base_url/api/v1/wallet/all" --silent --show-error --insecure | jq ".")"
    local available_wallets; available_wallets="$(jq -r '.wallets' <<< "$wallet_all_result")"

    echo "$available_wallets"
}

# --------------------------
# Verify no open session
# --------------------------
## API: GET /api/v1/session
## 
## Response:
## 200 OK
## { 
##    "session": false, 
##    "maker_running": false, 
##    "coinjoin_in_process": false, 
##    "wallet_name": "None"
## }
##
verify_no_open_session_or_throw() {
    local base_url; base_url=${1:-}

    if session_result=$(curl "$base_url/api/v1/session" --silent --show-error --insecure | jq "."); then
      msg_success "Successfully established connection to jmwalletd"
    else rc=$?
      die "Could not connect to joinmarket. Please make sure jmwalletd is running inside container."
    fi

    [ "$(jq -r '.session' <<< "$session_result")" != "false" ] && die "Please make sure no session is active."
    [ "$(jq -r '.wallet_name' <<< "$session_result")" != "None" ] && die "Please make sure no wallet is active."

    return 0
}
