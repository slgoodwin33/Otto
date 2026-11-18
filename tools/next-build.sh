#!/usr/bin/env bash
# Run right before committing a build, AFTER `git pull --rebase origin main`.
# Sets APP_BUILD in index.html and the "Current build" line in CLAUDE.md to today's date + (highest N on main) + 1,
# so two sessions never ship the same number. Prints the new build.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git fetch -q origin main
main_n=$(git show origin/main:index.html | sed -n "s/.*const APP_BUILD = '[0-9-]*\.\([0-9]*\)'.*/\1/p" | head -1)
here_n=$(sed -n "s/.*const APP_BUILD = '[0-9-]*\.\([0-9]*\)'.*/\1/p" index.html | head -1)
n=$(( (main_n > here_n ? main_n : here_n) ))
# only bump if this tree hasn't already moved past main
if [ "$here_n" -le "$main_n" ]; then n=$((main_n + 1)); fi
build="$(TZ=America/New_York date +%F).$n"
sed -i "s/const APP_BUILD = '[^']*'/const APP_BUILD = '$build'/" index.html
sed -i "s/Current build: \*\*[^*]*\*\*/Current build: **$build**/" CLAUDE.md
echo "$build"
