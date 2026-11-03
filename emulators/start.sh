#!/bin/sh
# Les données (comptes Auth + Firestore) sont conservées dans un volume Docker entre deux démarrages.
#
# Important : on exporte dans un SOUS-dossier du volume. Firebase supprime puis recrée le dossier
# d'export à chaque sauvegarde, et un point de montage Docker ne peut pas être supprimé (EBUSY).
PROJECT="${FIREBASE_PROJECT_ID:-demo-linkp}"
DATA=/data/export

ARGS="--project $PROJECT --export-on-exit $DATA"
if [ -f "$DATA/firebase-export-metadata.json" ]; then
  echo "Reprise des données sauvegardées ($DATA)"
  ARGS="$ARGS --import $DATA"
else
  echo "Aucune sauvegarde trouvée : démarrage à vide"
fi
exec firebase emulators:start $ARGS
