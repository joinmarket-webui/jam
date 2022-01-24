# Docker setup for running joinmarket in regtest mode

This setup will help you set up a regtest environment quickly.
It starts two JoinMarket container, hence not only API calls but also actual CoinJoin transactions can be tested.

## Commands

### Run

Go to the docker directory (`cd docker/regtest`) and execute:

```sh
docker-compose up
```

### Stop

```sh
docker-compose down
```

If you want to start from scratch, pass the `--volumes` param:

```sh
docker-compose down --volumes
```

## Images

The [Docker setup](dockerfile-deps/joinmarket/latest/Dockerfile) is directly taken from [BTCPay Server](https://github.com/btcpayserver/dockerfile-deps/tree/master/JoinMarket) with as little adaptations as possible.
It will fetch the latest commit from the [`master` branch of the joinmarket-clientserver repo](https://github.com/JoinMarket-Org/joinmarket-clientserver/tree/master).

As an example and as reference on how to build and test against specific versions,
see the adaptions needed to use BTCPay Servers image as base image in [`v0.9.3/Dockerfile`](dockerfile-deps/joinmarket/v0.9.3/Dockerfile).
This is useful if you want to perform regression tests.

### Rebuild

In order to incorporate the current contents of the master branch, simply rebuild the joinmarket images from scratch.

```sh
# remove existing images
docker image rm regtest_joinmarket:latest regtest_joinmarket2:latest

# rebuilding the imags with contents of current master branch
docker-compose build
```

## Debugging

### Debug logs

```sh
docker exec -t jm_regtest_joinmarket tail -f /root/.joinmarket/logs/jmwalletd_stdout.log
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
