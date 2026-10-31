#!/bin/sh
# Rebuild the throwaway test environment after a sandbox reset.
set -e
mkdir -p /tmp/lf && cd /tmp/lf && [ -f package/dist/leaflet.js ] || (npm pack leaflet@1.9.4 >/dev/null 2>&1 && tar xzf leaflet-1.9.4.tgz)
python3 -c "from PIL import Image; Image.new('RGB',(256,256),(226,224,218)).save('/tmp/tile.png')"
python3 /mnt/user-data/outputs/otto-paper-wip/testkit/fixtures_gen.py
echo "testkit ready"
