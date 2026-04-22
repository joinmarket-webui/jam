# Docker setup for running Jam in regtest mode

This setup will help you set up a regtest environment quickly.
It starts multiple JoinMarket containers, hence not only API calls but also actual CoinJoin transactions can be tested.
Communication between these containers is done via Tor and a local JoinMarket NG directory server.

All containers will have a wallet named `Satoshi.jmdat` with password `test`.
The second container has basic auth enabled (username `joinmarket` and password `joinmarket`).

## Common flow

```sh
# (optional) once in a while rebuild the images
npm run regtest:rebuild

# start the regtest environment
npm run regtest:up

# fund wallets and start maker in secondary and tertiary container
npm run regtest:init

# mine blocks in regtest periodically
npm run regtest:mine

# start jam in development mode
npm run dev

[...]

# stop the regtest environment
npm run regtest:down

# (optional) wipe all test data and start from scratch next time
npm run regtest:clear
```

## Commands

### Start

Start the regtest environment with:

```sh
npm run regtest:up

# (optional) fund wallets and start maker in secondary and tertiary containers
npm run regtest:init
```

Once the regtest environment is up and running you can start Jam with:

```sh
npm run dev
```

### Stop

```sh
npm run regtest:down
```

If you want to start from scratch (removing all volumes):

```sh
npm run regtest:clear
```

### Mine

Mine regtest blocks in a fixed interval (current default is every 11 seconds).
This is useful for features that await confirmations or need incoming blocks regularly.
e.g. This is necessary for scheduled transactions to execute successfully.

```sh
npm run regtest:mine
```

## Images

The JoinMarket containers use `ghcr.io/joinmarket-ng/joinmarket-ng/jmwalletd:main`.
The directory service uses `ghcr.io/joinmarket-ng/joinmarket-ng/directory-server:main`.
The orderbook watcher uses `ghcr.io/joinmarket-ng/joinmarket-ng/orderbook-watcher:main`.

Use `:main` for latest unstable/unreleased changes and `:latest` for the latest tagged release.

The second JoinMarket container is exposed on port `29080`.
The third container is exposed on port `30080`.
This is useful if you want to perform regression tests.

Additional JoinMarket NG containers act as directory server and orderbook watcher to enable peer discovery and orderbook queries between peers.

### Build

```sh
# building the images
npm run regtest:build
```

In order to incorporate recent upstream image changes, simply rebuild the setup from scratch.

```sh
# download and recompile the images from scratch (without using docker cache)
npm run regtest:rebuild
```

## Debugging

### Debug logs

```sh
# logs and follows content of log file in primary joinmarket container
npm run regtest:logs:jmwalletd
```

### Display running JoinMarket version

```sh
curl --insecure --silent https://localhost:28183/api/v1/getinfo | jq
```

## Helper scripts

Some helper scripts are included to make recurring tasks and interaction with the containers easier.

### `init-setup.sh`

This script helps in providing JoinMarket containers a wallet with spendable coins and starting the Maker Service in the secondary and tertiary containers.
Its main goal is to make CoinJoin transactions possible in the regtest environment.
It should be run immediately after the Docker setup is successfully started so you can start developing right away.
A wallet named `Satoshi.jmdat` with password `test` will be created if it does not exist.

```sh
# fund wallets and start maker service in secondary and tertiary containers
[user@home regtest]$ ./init-setup.sh
```

```text
[...]
Attempt to start maker for wallet 'Satoshi.jmdat' in secondary container ..
[...]
Successfully started maker for wallet 'Satoshi.jmdat'.
[...]
Attempt to start maker for wallet 'Satoshi.jmdat' in tertiary container ..
[...]
Successfully started maker for wallet 'Satoshi.jmdat'.
[...]
```

### `mine-block.sh`

Mine one or more blocks to an optionally given address.

```sh
[user@home regtest]$ ./mine-block.sh
```

Usage: mine-block.sh [# of blocks] [address]

```sh
# mine a single block
[user@home regtest]$ ./mine-block.sh

# mine 21 blocks
[user@home regtest]$ ./mine-block.sh 21

# mine 42 blocks to given address
[user@home regtest]$ ./mine-block.sh 42 bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx
```

This also comes in handy if you want to periodically mine blocks:

```sh
# mine a block every 5 seconds
[user@home regtest]$ watch -n 5 ./mine-block.sh
```

### `fund-wallet.sh`

Funding and/or creating a joinmarket regtest wallet.

See the help page for examples and more usage information:

```sh
[user@home regtest]$ ./fund-wallet.sh --help
```

#### Funding regtest wallet

Executed without parameters the script will create one _spendable_ coinbase output to a wallet named 'Satoshi.jmdat'.
If the wallet does not exist, it will be created. See the following output:

```sh
[user@home regtest]$ ./fund-wallet.sh
```

```text
Trying to fund wallet 'Satoshi.jmdat'..
[...]
Successfully generated 1 blocks with rewards to bcrt1qyz7wql00gghwk25er08re3dhtv66h20h8gtgsp
```

Control various parameters by passing options to the script.

e.g. "Mine 5 blocks to wallet `Satoshi.jmdat` with password `correctbatteryhorsestaple` in mixdepth 3"

```sh
[user@home regtest]$ ./fund-wallet.sh --blocks 5 --wallet-name Satoshi.jmdat --password correctbatteryhorsestaple --mixdepth 3
```

```text
Trying to fund wallet 'Satoshi.jmdat'..
Successfully established connection to jmwalletd
Wallet 'Satoshi.jmdat' does not exist - creating..
Successfully created wallet 'Satoshi.jmdat'.
Write down the seedphrase: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
Fetching new funding address from wallet 'Satoshi.jmdat' in mixdepth 3
Successfully fetched new funding address bcrt1qs0aqmzxjq96jk8hhmta5jfn339dk4cme074lq3
Locking wallet 'Satoshi.jmdat'
Successfully locked wallet 'Satoshi.jmdat'.
Generating 5 blocks with rewards to bcrt1qs0aqmzxjq96jk8hhmta5jfn339dk4cme074lq3
Successfully generated 5 blocks with rewards to bcrt1qs0aqmzxjq96jk8hhmta5jfn339dk4cme074lq3
```

## Resources

- [JoinMarket NG (GitHub)](https://github.com/joinmarket-ng/joinmarket-ng)
