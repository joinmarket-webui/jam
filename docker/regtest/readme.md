
# Docker setup for running joinmarket in regtest mode


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

# Troubleshooting
1. Joinmarket won't start in initial run

Solution: Somehow nbxplorer does not notify joinmarket that the chain is fully synced in the initial run.
Just shutdown all containers with `docker-compose down` wait for it to finish and run `docker-compose up` again (`docker-compose restart` did _not_ work sometimes!). 
Now you should see joinmarket coming up and see something like the following output:
```log
joinmarket_1  | 2009-01-03 00:02:44,907 INFO success: jmwalletd entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)
joinmarket_1  | 2009-01-03 00:02:44,907 INFO success: ob-watcher entered RUNNING state, process has stayed up for > than 1 seconds (startsecs)
```
