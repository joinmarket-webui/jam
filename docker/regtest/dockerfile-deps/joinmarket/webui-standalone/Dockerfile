FROM ghcr.io/joinmarket-webui/joinmarket-webui-dev-standalone:master

COPY default.cfg "${CONFIG}"

ENTRYPOINT  [ "tini", "-g", "--", "./docker-entrypoint.sh" ]
