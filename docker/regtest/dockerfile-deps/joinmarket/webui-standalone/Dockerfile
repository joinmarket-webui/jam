FROM ghcr.io/joinmarket-webui/joinmarket-webui-dev-standalone:dev-with-local-tor-from-repo

COPY default.cfg ${DEFAULT_CONFIG}

ENTRYPOINT  [ "tini", "-g", "--", "/jam-entrypoint.sh" ]
