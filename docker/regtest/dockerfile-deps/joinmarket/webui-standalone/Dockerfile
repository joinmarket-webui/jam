FROM ghcr.io/joinmarket-webui/jam-dev-standalone:master

COPY default.cfg ${DEFAULT_CONFIG}

ENTRYPOINT  [ "tini", "-g", "--", "/jam-entrypoint.sh" ]
