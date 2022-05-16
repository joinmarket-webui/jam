#!/bin/bash
set -e

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

# ensure 'logs' directory exists
mkdir -p "${DATADIR}/logs"

# auto start services
while read -r p; do
    [[ "$p" == "" ]] && continue
    [[ "$p" == "#"* ]] && continue
    echo "Auto start: $p"
    file_path="/etc/supervisor/conf.d/$p.conf"
    if [ -f "$file_path" ]; then
      sed -i 's/autostart=false/autostart=true/g' "$file_path"
    else
      echo "$file_path not found"
    fi
done < "$AUTO_START"

declare -A jmenv
while IFS='=' read -r -d '' envkey parsedval; do
    n="${envkey,,}" # lowercase
    if [[ "$n" =  jm_* ]]; then
        n="${n:3}" # drop jm_
        jmenv[$n]=${!envkey} # reread environment variable - characters might have been dropped (e.g 'ending in =')
    fi
done < <(env -0)

# adapt 'blockchain_source' is missing and we're in regtest mode
if [ "${jmenv['network']}" == "regtest" ] && [ "${jmenv['blockchain_source']}" == "" ]; then
    jmenv['blockchain_source']='regtest'
fi

# there is no 'regtest' value for config 'network': make sure to use "testnet" in regtest mode
if [ "${jmenv['network']}" == "regtest" ]; then
    jmenv['network']='testnet'
fi

# ---------- Hidden Service Directory
# Avoid preventing user provided files: Copy the contents of the mounted directory to an own directory
jmenv['hidden_service_dir']=${jmenv['hidden_service_dir']:-'\/root\/.joinmarket\/hidden_service_dir'}
hsdirEscapedUnsafe="${jmenv['hidden_service_dir']}"
hsdirEscapedSafe="${hsdirEscapedUnsafe}__copy"
jmenv['hidden_service_dir']="${hsdirEscapedSafe}"

hsdirUnsafe=$(sed "s/^.*/${hsdirEscapedUnsafe}/g" <<< '')
hsdirSafe=$(sed "s/^.*/${hsdirEscapedSafe}/g" <<< '')

mkdir -p "${hsdirUnsafe}"
rm -rf "${hsdirSafe}"
cp -R "${hsdirUnsafe}" "${hsdirSafe}"
chown root:root -R "${hsdirSafe}"
# this is important because tor is very finicky about permissions
# see https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/68c64e135dabafca8ed78202ace1ced1884684be/docs/onion-message-channels.md#joinmarket-specific-configuration
chmod 600 -R "${hsdirSafe}"
# ---------- Hidden Service Directory - End

# For every env variable JM_FOO=BAR, replace the default configuration value of 'foo' by 'BAR'
for key in "${!jmenv[@]}"; do
    val=${jmenv[${key}]}
    sed -i "s/^$key =.*/$key = $val/g" "$CONFIG" || echo "Couldn't set : $key = $val, please modify $CONFIG manually"
done


exec supervisord
