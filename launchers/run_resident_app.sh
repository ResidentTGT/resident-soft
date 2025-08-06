#!/usr/bin/env bash

export NODE_OPTIONS="--disable-warning=DEP0040 --disable-warning=DEP0169"
chmod +x "$(dirname "$0")/resident_app"
exec "$(dirname "$0")/resident_app" "$@"