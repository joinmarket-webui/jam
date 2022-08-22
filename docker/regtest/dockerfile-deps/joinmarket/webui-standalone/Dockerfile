#FROM ghcr.io/joinmarket-webui/joinmarket-webui-dev-standalone:master
FROM joinmarket-webui/jam-standalone-logs1:latest

COPY default.cfg ${DEFAULT_CONFIG}

ENTRYPOINT  [ "tini", "-g", "--", "/jam-entrypoint.sh" ]
