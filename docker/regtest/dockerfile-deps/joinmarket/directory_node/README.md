Starts a staging joinmarket directory node that you can point to in your regtest configurations.

- start-dn.py taken from https://github.com/JoinMarket-Org/custom-scripts/blob/e3c5fb548c704fc56cdaa869705797955a9821dd/start-dn.py
  (might already be in master - last check on 2022-05-11)

You must mount the directory specified in `hidden_service_dir`, which contains hostname, public and private key, 
and provide the correct onion hostname via `directory_nodes` yourself!

e.g. in a docker-compose setup:
```yml
  joinmarket_directory_node:
    [...]
    environment:
      jm_hidden_service_dir: \/root\/.joinmarket\/hidden_service_dir
      jm_directory_nodes: jamobvon3jdgjnvuxur7vpdr6hzwrxhu5li3pnannfrrrupg5sb6ouyd.onion:5222
    volumes:
      - "./my-hidden_service_dir:/root/.joinmarket/hidden_service_dir:z"
```
