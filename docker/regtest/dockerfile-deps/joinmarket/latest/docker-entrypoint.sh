#!/bin/bash
set -e

export JM_onion_serving_host="$(/sbin/ip route | awk '/src/ { print $9 }')"

# First we restore the default cfg as created by wallet-tool.py generate
if ! [ -f "$CONFIG" ]; then
    cp "$DEFAULT_CONFIG" "$CONFIG"
fi

if ! [ -f "$AUTO_START" ]; then
    cp "$DEFAULT_AUTO_START" "$AUTO_START"
fi

# generate ssl certificates for jmwalletd
if ! [ -f "${DATADIR}/ssl/key.pem" ]; then
    subj="/C=US/ST=Utah/L=Lehi/O=Your Company, Inc./OU=IT/CN=example.com"
    mkdir -p "${DATADIR}/ssl/" \
      && pushd "$_" \
      && openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -out cert.pem -keyout key.pem -subj "$subj" \
      && popd
fi

# auto start services
while read p; do
  [[ "$p" == "" ]] && continue
  [[ "$p" == "#"* ]] && continue
  echo "Auto start: $p"
  file_path="/etc/supervisor/conf.d/$p.conf"
  if [ -f "$file_path" ]; then
    sed -i 's/autostart=false/autostart=true/g' $file_path
  else
    echo "$file_path not found"
  fi
done <$AUTO_START

# For every env variable JM_FOO=BAR, replace the default configuration value of 'foo' by 'bar'
while IFS='=' read -r -d '' n v; do
    n="${n,,}" # lowercase
    if [[ "$n" =  jm_* ]]; then
        n="${n:3}" # drop jm_
        sed -i "s/^$n = .*/$n = $v/g" "$CONFIG" || echo "Couldn't set : $n = $v, please modify $CONFIG manually"
    fi
done < <(env -0)
#####################################

if [[ "${READY_FILE}" ]]; then
    echo "Waiting $READY_FILE to be created..."
    while [ ! -f "$READY_FILE" ]; do sleep 1; done
    echo "The chain is fully synched"
fi

exec supervisord
