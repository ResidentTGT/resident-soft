#!/usr/bin/env bash

export NODE_OPTIONS="--disable-warning=DEP0040 --disable-warning=DEP0169"

# Запуск бинаря из той же директории, передавая все аргументы
exec "$(dirname "$0")/resident_app" "$@"