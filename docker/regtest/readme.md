
# Docker setup for running joinmarket in regtest mode

This setup will help you set up a regtest environment quickly. 
It starts two Joinmarket container, hence not only API calls but also actual Coinjoin transactions can be tested.

## Run
Go to the docker directory (`cd docker/regtest`) and execute:

```shell
docker-compose up
```

(run `docker-compose down -v` before to start with a fresh setup)

## Stop
```shell
docker-compose down
```

If you want to start from scratch, pass the `-v` param:
```shell
docker-compose down -v
```

## Helper scripts

A helper script is included to make recurring tasks and interaction with the containers easier.
Currently the only functionality is funding a joinmarket regtest wallet.

### `regtest-control.sh`

```shell script
[user@home regtest]$ ./regtest-control.sh --help
```
```
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
```

#### Funding regtest wallet
Executed without parameters the script will create one _spendable_ coinbase output to a wallet named 'funded.jmdat'.
If the wallet does not exist, it will be created. See the following output:

```shell script
[user@home regtest]$ ./regtest-control.sh
```
```
Trying to fund wallet funded.jmdat..
[...]
Successfully generated 1 blocks with rewards to bcrt1qyz7wql00gghwk25er08re3dhtv66h20h8gtgsp
```


Control various parameters by passing options to the script.

e.g. "Mine 5 blocks to wallet `satoshi.jmdat` with password `correctbatteryhorsestaple` in mixdepth 3"
```shell script
[user@home regtest]$ ./regtest-control.sh --blocks 5 --wallet-name satoshi.jmdat --password correctbatteryhorsestaple --mixdepth 3
```
```
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

# Troubleshooting
1. Joinmarket won't start in initial run

Solution: Somehow nbxplorer does not notify joinmarket that the chain is fully synced in the initial run.
Just shutdown all containers with `docker-compose down` wait for it to finish and run `docker-compose up` again (`docker-compose restart` did _not_ work sometimes!). 
Now you should see joinmarket coming up and see something like the following output:
```log
joinmarket_1  | 2009-01-03 00:02:44,907 INFO success: jmwalletd entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)
joinmarket_1  | 2009-01-03 00:02:44,907 INFO success: ob-watcher entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)
```
