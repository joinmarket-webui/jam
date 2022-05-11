#!/usr/bin/env bash

###
#
# This script helps initializing the joinmarket docker containers.
# Its main goal is to make CoinJoin transactions possible in the regtest environment.
#
# It has two responsibilities:
# - funding wallets in both containers with some coins
# - starting the maker service in the secondary container
#
###

set -Eeuo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

# fund wallet in primary joinmarket container
. "$script_dir/fund-wallet.sh" --container jm_regtest_joinmarket --unmatured --blocks 3

# fund wallet in secondary joinmarket container
# this will get more coins than the primary one in order to successfully run the tumbler.py script
. "$script_dir/fund-wallet.sh" --container jm_regtest_joinmarket2 --unmatured --blocks 50

# make block rewards spendable
. "$script_dir/mine-block.sh" 110 &>/dev/null


base_url='https://localhost:29183'
wallet_name='funded.jmdat'
wallet_password='test'

msg "Attempt to start maker service for wallet $wallet_name in secondary container.."

# --------------------------
# Check if maker service is not yet running
# --------------------------
if session_result=$(curl "$base_url/api/v1/session" --silent --show-error --insecure | jq "."); then
  msg_success "Successfully established connection to jmwalletd"
else rc=$?
  die "Could not connect to joinmarket. Please make sure jmwalletd is running inside container."
fi

maker_running=$(jq -r '.maker_running' <<< "$session_result")

if [ "$maker_running" != false ]; then
  msg_success "Maker is already running"
else
    # --------------------------
    # Unlock wallet
    # --------------------------
    unlock_result=$(unlock_wallet "$base_url" "$wallet_name" "$wallet_password")

    auth_token=$(jq -r '.token' <<< "$unlock_result")
    auth_header="Authorization: Bearer $auth_token"

    # --------------------------
    # Start maker
    # --------------------------
    ## API: POST /api/v1/wallet/$wallet_name/maker/start
    ## 
    ## Response: 
    ## 200 OK
    ## {}
    msg "Starting maker service for wallet $wallet_name.."  
    start_maker_request_payload="{\"txfee\":0,\"cjfee_a\":250,\"cjfee_r\":0.0003,\"ordertype\":\"sw0absoffer\",\"minsize\":10000}"

    start_maker_result=$(curl "$base_url/api/v1/wallet/$wallet_name/maker/start" --silent --show-error --insecure -H "$auth_header" --data "$start_maker_request_payload" | jq ".")

    if [ "$start_maker_result" != "{}" ]; then
        msg_warn "There has been a problem starting the maker service: $start_maker_result"
    else
        msg_success "Successfully started maker for wallet $wallet_name in secondary container."
    fi
    
    # do not lock the wallet as this will terminate the maker service
    msg_warn "Wallet $wallet_name in secondary container remains unlocked!"
fi
