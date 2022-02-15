FROM joinmarket-webui/joinmarket-webui-dev-standalone:latest

COPY default.cfg "${CONFIG}"

ENTRYPOINT  [ "tini", "-g", "--", "./docker-entrypoint.sh" ]
