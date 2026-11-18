#!/bin/sh
# Test dependencies for tests/harness.mjs (repo-relative). Playwright + Chromium are preinstalled in the cloud container.
set -e
cd "$(dirname "$0")" && mkdir -p .cache && cd .cache
[ -f leaflet-1.9.4/package/dist/leaflet.js ] || (npm pack leaflet@1.9.4 >/dev/null 2>&1 && mkdir -p leaflet-1.9.4 && tar xzf leaflet-1.9.4.tgz -C leaflet-1.9.4)
[ -f axe-core-4.10.2/package/axe.min.js ] || (npm pack axe-core@4.10.2 >/dev/null 2>&1 && mkdir -p axe-core-4.10.2 && tar xzf axe-core-4.10.2.tgz -C axe-core-4.10.2)
cd .. && python3 fixtures_gen.py
echo "testkit ready"
