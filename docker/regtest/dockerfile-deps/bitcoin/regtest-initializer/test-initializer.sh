#!/bin/sh
# Run with sh test-initializer.sh; requires jq, but not Docker or Bitcoin Core.
set -eu

source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
temp=$(mktemp -d)
trap 'rm -rf "$temp"' EXIT
mkdir "$temp/bin"
for script in entrypoint mine-blocks wait-for-bitcoind wait-for-blocks; do
    cp "$source_dir/$script.sh" "$temp/bin/"
    chmod +x "$temp/bin/$script.sh"
done
export PATH="$temp/bin:$PATH"
export RPC_USER=test RPC_PASSWORD=test RPC_HOST=mock RPC_PORT=43782
export READY_FILE="$temp/ready" CALLS="$temp/calls"

cat > "$temp/bin/curl" <<'STUB'
#!/bin/sh
case "$*" in
    *generatetoaddress*)
        echo mine >> "$CALLS"
        case "$SCENARIO" in
            rpc-error) echo '{"result":null,"error":{"code":-1,"message":"rejected"}}' ;;
            http-error) exit 22 ;;
            malformed) echo 'not json' ;;
            partial) echo '{"result":[],"error":null}' ;;
            *) jq -nc '{result:[range(101) | ("a" * 64)],error:null}' ;;
        esac
        ;;
    *getblockchaininfo*)
        echo height >> "$CALLS"
        case "$SCENARIO" in
            unavailable) exit 7 ;;
            invalid-height) echo '{"result":{"blocks":"999"},"error":null}' ;;
            stale-height) echo '{"result":{"blocks":0},"error":null}' ;;
            fresh)
                if grep -q mine "$CALLS"; then height=101; else height=0; fi
                printf '{"result":{"blocks":%s},"error":null}\n' "$height"
                ;;
            *) echo '{"result":{"blocks":200},"error":null}' ;;
        esac
        ;;
    *) exit 99 ;;
esac
STUB

cat > "$temp/bin/sleep" <<'STUB'
#!/bin/sh
exit 0
STUB
chmod +x "$temp/bin/curl" "$temp/bin/sleep"

run_scenario() {
    export SCENARIO="$1"
    : > "$CALLS"
    # Simulate a readiness marker left by a previous invocation.
    echo stale > "$READY_FILE"
    if entrypoint.sh > "$temp/output" 2>&1; then
        status=0
    else
        status=$?
    fi
    if [ "$status" != "$2" ]; then
        cat "$temp/output" >&2
        echo "$SCENARIO: expected exit $2, got $status" >&2
        exit 1
    fi
}

run_scenario fresh 0
[ "$(cat "$READY_FILE")" = 1 ]
[ "$(cat "$CALLS")" = "$(printf 'height\nmine\nheight')" ]

for scenario in rpc-error http-error malformed partial; do
    run_scenario "$scenario" 1
    [ ! -e "$READY_FILE" ]
    grep -q generatetoaddress "$temp/output"
    [ "$(cat "$CALLS")" = "$(printf 'height\nmine')" ]
done

for scenario in unavailable invalid-height stale-height; do
    run_scenario "$scenario" 1
    [ ! -e "$READY_FILE" ]
    grep -q 'Timed out' "$temp/output"
    if [ "$scenario" = stale-height ]; then
        [ "$(grep -c '^height$' "$CALLS")" -eq 21 ]
        [ "$(grep -c '^mine$' "$CALLS")" -eq 1 ]
    else
        [ "$(grep -c '^height$' "$CALLS")" -eq 20 ]
        [ "$(grep -c '^mine$' "$CALLS" || true)" -eq 0 ]
    fi
done

echo "Initializer regression checks passed"
