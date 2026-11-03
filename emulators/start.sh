#!/bin/sh
# Les données sont conservées dans /data (volume Docker) entre deux démarrages.
PROJECT="${FIREBASE_PROJECT_ID:-demo-linkp}"
ARGS="--project $PROJECT --export-on-exit /data"
if [ -f /data/firebase-export-metadata.json ]; then
  ARGS="$ARGS --import /data"
fi
exec firebase emulators:start $ARGS
