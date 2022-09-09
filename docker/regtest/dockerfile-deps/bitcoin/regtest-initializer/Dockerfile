FROM alpine:3.16

# install build dependencies
RUN apk add --no-cache --update curl jq

COPY wait-for-bitcoind.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/wait-for-bitcoind.sh

COPY wait-for-blocks.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/wait-for-blocks.sh

COPY mine-blocks.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/mine-blocks.sh

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENTRYPOINT  [ "/entrypoint.sh" ]
