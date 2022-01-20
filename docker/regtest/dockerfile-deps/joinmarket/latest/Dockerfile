FROM python:3.9.7-slim-bullseye

RUN apt-get update && \
    apt-get install -qq --no-install-recommends curl tini sudo procps vim git iproute2 \
    build-essential automake pkg-config libtool libgmp-dev libltdl-dev python3-dev virtualenv python3-pip supervisor && \
    rm -rf /var/lib/apt/lists/*

ENV REPO https://github.com/JoinMarket-Org/joinmarket-clientserver
ENV REPO_REF master

WORKDIR /src
RUN git clone "$REPO" . --depth=10 --branch "$REPO_REF" && git checkout "$REPO_REF"

RUN ./install.sh --disable-secp-check --without-qt
ENV DATADIR /root/.joinmarket
ENV CONFIG ${DATADIR}/joinmarket.cfg
ENV DEFAULT_CONFIG /root/default.cfg
ENV DEFAULT_AUTO_START /root/autostart
ENV AUTO_START ${DATADIR}/autostart
ENV ENV_FILE "${DATADIR}/.env"

COPY default.cfg "${CONFIG}"

RUN . jmvenv/bin/activate && \
    cd /src/scripts && \
    pip install matplotlib && \
    (python wallet-tool.py generate || true) && \
    cp "${CONFIG}" "${DEFAULT_CONFIG}"
WORKDIR /src/scripts
COPY docker-entrypoint.sh .
COPY *.sh ./
COPY autostart /root/
COPY supervisor-conf/*.conf /etc/supervisor/conf.d/
ENV PATH /src/scripts:$PATH

# generate ssl certificates for jmwalletd
RUN mkdir -p "${DATADIR}/ssl/" && \
    cd "${DATADIR}/ssl/" && \
    openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -out cert.pem -keyout key.pem \
    -subj "/C=US/ST=Utah/L=Lehi/O=Your Company, Inc./OU=IT/CN=example.com"

# payjoin server
EXPOSE 8080
# obwatch
EXPOSE 62601 
# joinmarketd daemon
EXPOSE 27183
# jmwallet daemon
EXPOSE 28183

ENTRYPOINT  [ "tini", "-g", "--", "./docker-entrypoint.sh" ]
