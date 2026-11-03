# LinkP

Plateforme qui aide à écrire des posts LinkedIn dans le style de chacun : idées, thèmes, bons mots, et planification sur la période choisie.

## Stack

- **Frontend** : Next.js (App Router) + Tailwind CSS
- **Backend** : FastAPI + SQLAlchemy
- **Base de données** : PostgreSQL
- **Authentification** : Supabase (JWT vérifié côté API)
- **Génération des posts** : API RodiumAI (compatible OpenAI)
- **Infra** : Docker Compose

## Démarrage

1. Copier le fichier d'exemple et renseigner les variables :

   ```bash
   cp .env.example .env
   ```

   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Supabase, Project Settings > API
   - `RODIUM_API_KEY` : clé de l'API RodiumAI
   - `NEXT_PUBLIC_ENABLE_GOOGLE` : `true` une fois Google activé dans Supabase

2. Lancer l'ensemble :

   ```bash
   docker compose up --build
   ```

3. Ouvrir http://localhost:3000 (API : http://localhost:8000, santé : `/health`).

## Structure

```
frontend/   Next.js : accueil, connexion, dashboard
backend/    FastAPI : profil, exemples de posts, génération
```

Ne jamais commiter le fichier `.env` (il est ignoré par git).
