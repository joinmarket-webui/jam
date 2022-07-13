FROM ghcr.io/joinmarket-webui/joinmarket-webui-dev-standalone:master

COPY default.cfg "${DEFAULT_CONFIG}"

ENTRYPOINT  [ "tini", "-g", "--", "/jam-entrypoint.sh" ]
