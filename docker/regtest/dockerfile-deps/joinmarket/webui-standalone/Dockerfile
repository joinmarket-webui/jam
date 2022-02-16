FROM ghcr.io/joinmarket-webui/joinmarket-webui-dev-standalone:master@sha256:8e4beed972c9bf41fa6607bfad576ef75c6e73e47e978c96580bf8fd28751bbb

COPY default.cfg "${CONFIG}"

ENTRYPOINT  [ "tini", "-g", "--", "./docker-entrypoint.sh" ]
