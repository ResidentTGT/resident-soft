@echo off

set "NODE_OPTIONS=--disable-warning=DEP0040 --disable-warning=DEP0169"
"%~dp0resident_app.exe" %*