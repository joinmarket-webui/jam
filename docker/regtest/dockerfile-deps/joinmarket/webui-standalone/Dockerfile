FROM ghcr.io/joinmarket-webui/jam-dev-standalone:wait-for-bitcoind

COPY default.cfg ${DEFAULT_CONFIG}

ENTRYPOINT  [ "tini", "-g", "--", "/jam-entrypoint.sh" ]
