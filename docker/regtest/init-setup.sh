#!/usr/bin/env bash

###
#
# This script helps initializing the JoinMarket docker containers.
# Its main goal is to make CoinJoin transactions possible in the regtest environment.
#
# It has two responsibilities:
# - funding wallets in all containers with some coins
# - starting the maker service in the secondary and tertiary container
#
###

set -Eeuo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

# fund wallet in primary JoinMarket container
. "$script_dir/fund-wallet.sh" --container jm_regtest_joinmarket --unmatured --blocks 3

# fund wallet in secondary and tertiary JoinMarket container.
# these will get more coins than the primary one in order to have enough liquidity
# to run the scheduler (scheduled sweep) successfully multiple times.
. "$script_dir/fund-wallet.sh" --container jm_regtest_joinmarket2 --unmatured --blocks 50
. "$script_dir/fund-wallet.sh" --container jm_regtest_joinmarket3 --unmatured --blocks 50

# fund addresses of seed 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
# this is useful if you "import an existing wallet" and verify rescanning the chain works as expected.
dummy_wallet_address1='bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk' # 1st address of jar A (m/84'/1'/0'/0/0)
dummy_wallet_address2='bcrt1qt5yxk3xzrx66q9wd5sdyynklqynqcyf7uh74j3' # 8th address of jar C (m/84'/1'/2'/0/7)
dummy_wallet_address3='bcrt1qn8804dw5fahuc5cwqteuq5j4xlhk2cnkq7a8kw' # 21st change address of jar E (m/84'/1'/4'/1/21)
# make block rewards spendable: 100 + 5 (default of `taker_utxo_age`) + 1 = 106
. "$script_dir/mine-block.sh" 2 "$dummy_wallet_address1" &>/dev/null
. "$script_dir/mine-block.sh" 2 "$dummy_wallet_address2" &>/dev/null
. "$script_dir/mine-block.sh" 2 "$dummy_wallet_address3" &>/dev/null
. "$script_dir/mine-block.sh" 100 &>/dev/null

start_maker() {
    local base_url; base_url=${1:-}
    local wallet_name; wallet_name=${2:-}
    local wallet_password; wallet_password=${3:-}
    
    # Check if maker service is not yet running
    verify_no_open_session_or_throw "$base_url"

    local maker_running; maker_running=$(is_maker_running "$base_url")

    if [ "$maker_running" != false ]; then
      msg_success "Maker is already running"
    else
        # Unlock wallet
        local unlock_result; unlock_result=$(unlock_wallet "$base_url" "$wallet_name" "$wallet_password")

        local auth_token; auth_token=$(jq -r '.token' <<< "$unlock_result")
        local auth_header; auth_header="Authorization: Bearer $auth_token"

        # --------------------------
        # Start maker
        # --------------------------
        ## API: POST /api/v1/wallet/$wallet_name/maker/start
        ## 
        ## Response: 
        ## 200 OK
        ## {}
        msg "Starting maker service for wallet $wallet_name.."  
        local start_maker_request_payload; start_maker_request_payload="{\"txfee\":\"0\",\"cjfee_a\":\"250\",\"cjfee_r\":\"0.0003\",\"ordertype\":\"sw0absoffer\",\"minsize\":\"1\"}"

        local start_maker_result; start_maker_result=$(curl "$base_url/api/v1/wallet/$wallet_name/maker/start" --silent --show-error --insecure -H "$auth_header" --data "$start_maker_request_payload" | jq ".")

        if [ "$start_maker_result" != "{}" ]; then
            msg_warn "There has been a problem starting the maker service: $start_maker_result"
        else
            msg_success "Successfully started maker for wallet $wallet_name."
        fi
        
        # do not lock the wallet as this will terminate the maker service
        msg_warn "Wallet $wallet_name remains unlocked!"
    fi
}

msg "Attempt to start maker service for wallet $wallet_name in secondary container.."
start_maker "https://localhost:29183" "Satoshi.jmdat" "test"

msg "Attempt to start maker service for wallet $wallet_name in tertiary container.."
start_maker "https://localhost:30183" "Satoshi.jmdat" "test"
