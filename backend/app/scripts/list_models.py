"""Liste les modèles disponibles chez RodiumAI.

Usage : python -m app.scripts.list_models [filtre]
Exemple : python -m app.scripts.list_models gemini
"""
import sys

import httpx

from ..config import settings


def main() -> None:
    needle = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    r = httpx.get(
        f"{settings.rodium_api_url.rstrip('/')}/models",
        headers={"Authorization": f"Bearer {settings.rodium_api_key}"},
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
