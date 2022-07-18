FROM ghcr.io/joinmarket-webui/joinmarket-webui-dev-standalone:dev-with-local-tor

COPY default.cfg ${DEFAULT_CONFIG}

ENTRYPOINT  [ "tini", "-g", "--", "/jam-entrypoint.sh" ]
