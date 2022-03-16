# Docker setup for running JoinMarket in regtest mode

This setup will help you set up a regtest environment quickly.
It starts two JoinMarket containers, hence not only API calls but also actual CoinJoin transactions can be tested.

## Commands

### Run

Start the regtest environment with:

```sh
npm run regtest:up
```

### Stop

```sh
npm run regtest:down
```

If you want to start from scratch (removing all volumes):

```sh
npm run regtest:clear
```

## Images

The [Docker setup](dockerfile-deps/joinmarket/latest/Dockerfile) is an adaption of [joinmarket-webui-standalone](https://github.com/joinmarket-webui/joinmarket-webui-docker/tree/master/standalone) with as little adaptations as possible.
It will fetch the latest commit from the [`master` branch of the joinmarket-clientserver repo](https://github.com/JoinMarket-Org/joinmarket-clientserver/tree/master).
Keep in mind: Building from `master` is not always reliable. This tradeoff is made to enable testing new features immediately by just rebuilding the images.

The second JoinMarket container is based on `joinmarket-webui/joinmarket-webui-dev-standalone:master` which exposes an UI on port `29080`
(username `joinmarket` and pass `joinmarket` for Basic Authentication).
This is useful if you want to perform regression tests.

### Rebuild

In order to incorporate the current contents of `master` branch, simply rebuild the joinmarket images from scratch.

```sh
# rebuilding the images with contents of current master branch
npm run regtest:rebuild
```

## Debugging

### Debug logs

```sh
# logs and follows content of log file `.joinmarket/logs/jmwalletd_stdout.log` in primary joinmarket container
npm run regtest:logs:jmwalletd
```

### Display running JoinMarket version

```sh
docker exec -t jm_regtest_joinmarket git log --oneline -1
```

## Helper scripts

Some helper scripts are included to make recurring tasks and interaction with the containers easier.

### `init-setup.sh`

This script helps in providing both JoinMarket containers a wallet with spendable coins and starting the Maker Service in the secondary container.
Its main goal is to make CoinJoin transactions possible in the regtest environment.
It should be run immediately after the Docker setup is successfully started so you can start developing right away.

```sh
# fund wallets and start maker service in secondary container
[user@home regtest]$ ./init-setup.sh
```

```text
[...]
Attempt to start maker for wallet funded.jmdat in secondary container ..
[...]
Starting maker service for wallet funded.jmdat
Successfully started maker for wallet funded.jmdat in secondary container.
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

Executed without parameters the script will create one _spendable_ coinbase output to a wallet named 'funded.jmdat'.
If the wallet does not exist, it will be created. See the following output:

```sh
[user@home regtest]$ ./fund-wallet.sh
```

```text
Trying to fund wallet funded.jmdat..
[...]
Successfully generated 1 blocks with rewards to bcrt1qyz7wql00gghwk25er08re3dhtv66h20h8gtgsp
```

Control various parameters by passing options to the script.

e.g. "Mine 5 blocks to wallet `satoshi.jmdat` with password `correctbatteryhorsestaple` in mixdepth 3"

```sh
[user@home regtest]$ ./fund-wallet.sh --blocks 5 --wallet-name satoshi.jmdat --password correctbatteryhorsestaple --mixdepth 3
```

```text
Trying to fund wallet satoshi.jmdat..
Successfully established connection to jmwalletd
Wallet satoshi.jmdat does not exist - creating..
Successfully created wallet satoshi.jmdat.
Write down the seedphrase: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
Fetching new funding address from wallet satoshi.jmdat in mixdepth 3
Successfully fetched new funding address bcrt1qs0aqmzxjq96jk8hhmta5jfn339dk4cme074lq3
Locking wallet satoshi.jmdat
Successfully locked wallet satoshi.jmdat.
Generating 5 blocks with rewards to bcrt1qs0aqmzxjq96jk8hhmta5jfn339dk4cme074lq3
Successfully generated 5 blocks with rewards to bcrt1qs0aqmzxjq96jk8hhmta5jfn339dk4cme074lq3
```

## Troubleshooting

### Joinmarket won't start in initial run

Solution: Somehow nbxplorer does not notify joinmarket that the chain is fully synced in the initial run.
Just shutdown all containers with `docker-compose down` wait for it to finish and run `docker-compose up` again (`docker-compose restart` did _not_ work sometimes!).
Now you should see joinmarket coming up and see something like the following output:

```log
joinmarket_1  | 2009-01-03 00:02:44,907 INFO success: jmwalletd entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)
joinmarket_1  | 2009-01-03 00:02:44,907 INFO success: ob-watcher entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)
```

## Resources

- [JoinMarket Server (GitHub)](https://github.com/JoinMarket-Org/joinmarket-clientserver)
- [JoinMarket Server Testing Docs (GitHub)](https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/TESTING.md)
- [BTCPay Server JoinMarket Docker Setup (GitHub)](https://github.com/btcpayserver/dockerfile-deps/tree/master/JoinMarket)
- [BTCPay Server JoinMarket Image (DockerHub)](https://hub.docker.com/r/btcpayserver/joinmarket)
