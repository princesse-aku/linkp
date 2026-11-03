"""Liste les modèles disponibles chez RodiumAI.

Utilise la variable d'environnement RODIUM_API_KEY (ta propre clé, uniquement pour ce script).

Usage : python -m app.scripts.list_models [filtre]
Exemple : python -m app.scripts.list_models gemini
"""
import os
import sys

import httpx

from ..config import settings


def main() -> None:
    needle = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    r = httpx.get(
        f"{settings.rodium_api_url.rstrip('/')}/models",
        headers={"Authorization": f"Bearer {os.environ.get('RODIUM_API_KEY', '')}"},
        timeout=30,
    )
    r.raise_for_status()
    ids = sorted(m["id"] for m in r.json().get("data", []))
    for model_id in ids:
        if needle in model_id.lower():
            print(model_id)
    print(f"\n{len(ids)} modèles au total. Modèle utilisé : {settings.rodium_model}")


if __name__ == "__main__":
    main()
