#!/bin/bash
set -e

cd ..
. jmvenv/bin/activate
cd scripts

export JM_onion_serving_host="$(/sbin/ip route|awk '/src/ { print $9 }')"


# First we restore the default cfg as created by wallet-tool.py generate
if ! [ -f "$CONFIG" ]; then
    cp "$DEFAULT_CONFIG" "$CONFIG"
fi

if ! [ -f "$AUTO_START" ]; then
    cp "$DEFAULT_AUTO_START" "$AUTO_START"
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