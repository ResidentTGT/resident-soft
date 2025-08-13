#!/usr/bin/env bash

export NODE_NO_WARNINGS=1
chmod +x "$(dirname "$0")/resident_app"
exec "$(dirname "$0")/resident_app" "$@"