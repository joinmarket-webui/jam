FROM btcpayserver/joinmarket:0.9.3

COPY autostart /root/
COPY default.cfg "${CONFIG}"
COPY supervisor-conf/*.conf /etc/supervisor/conf.d/

# generate ssl certificates for jmwalletd
RUN mkdir -p "${DATADIR}/ssl/" && cd "${DATADIR}/ssl/" && \
    openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -out cert.pem -keyout key.pem \
    -subj "/C=US/ST=Utah/L=Lehi/O=Your Company, Inc./OU=IT/CN=example.com"

#RUN cd /src && \
#    . jmvenv/bin/activate && \
#    pip install -r requirements/testing.txt

# joinmarket daemon on port 27183; jmwalletd on port 28183
EXPOSE 27183 28183
ENTRYPOINT  [ "tini", "-g", "--", "./docker-entrypoint.sh" ]