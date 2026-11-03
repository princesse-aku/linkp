# LinkP

Plateforme qui aide à écrire des posts LinkedIn dans le style de chacun : idées de thèmes, analyse du style, rédaction, et planification avec rappels Google Agenda.

## Stack

| Besoin | Développement | Production |
| --- | --- | --- |
| Authentification (email + Google) | Émulateur Firebase Auth | Firebase Auth |
| Base de données | Émulateur Firestore | Firestore |
| Emails (bienvenue, confirmation, mot de passe oublié) | Mailpit (boîte locale) | Resend |
| IA (analyse, idées, rédaction) | RodiumAI, modèle `google/gemini-3.8-flash` | RodiumAI |
| Rappels des posts programmés | Google Agenda API | Google Agenda API |
| Fichiers (images, PDF) | Cloudinary | Cloudinary |

Frontend : Next.js + Tailwind. Backend : FastAPI. Tout tourne dans Docker Compose.

## Démarrage en local

```bash
cp .env.example .env      # puis remplir au minimum RODIUM_API_KEY
docker compose up --build
```

| Service | Adresse |
| --- | --- |
| Site | http://localhost:3000 |
| API (docs interactives) | http://localhost:8000/docs |
| Interface des émulateurs Firebase | http://localhost:4000 |
| Boîte mail de dev (Mailpit) | http://localhost:8025 |

Avec les émulateurs, aucun compte Firebase n'est nécessaire : le projet `demo-linkp` fonctionne hors ligne, les comptes créés apparaissent dans l'interface des émulateurs et les emails arrivent dans Mailpit. Les données sont conservées entre deux démarrages (volume `emulator-data`).

Pour tout effacer : `docker compose down -v`.

### Tests

Les tests du backend tournent contre les émulateurs (IA, Google, Cloudinary et Resend sont simulés ; Mailpit est utilisé pour de vrai) :

```bash
docker compose run --rm backend pytest
```

### Choisir le modèle d'IA

```bash
docker compose run --rm backend python -m app.scripts.list_models gemini
```

Puis renseigner `RODIUM_MODEL` dans `.env`.

## Configuration des services

Toutes les variables sont décrites dans [.env.example](.env.example).

### Google Agenda (Google Cloud Console)

1. Créer un projet, activer **Google Calendar API**.
2. Écran de consentement OAuth : ajouter le scope `.../auth/calendar.events` (et, en test, ton adresse comme utilisateur de test).
3. Créer des identifiants **ID client OAuth, application Web**. URI de redirection autorisée : `{BACKEND_PUBLIC_URL}/api/calendar/callback` (en local : `http://localhost:8000/api/calendar/callback`).
4. Renseigner `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.

Chaque utilisateur connecte son propre agenda depuis le dashboard. Les jetons sont stockés côté serveur uniquement (`users/{uid}/private/google`).

### Cloudinary

Renseigner `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (tableau de bord Cloudinary). Les fichiers sont rangés dans `{CLOUDINARY_FOLDER}/{ENV}/{uid}/`.

### Mailtrap à la place de Mailpit (facultatif)

Dans `.env` : `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, et retirer `SMTP_HOST`/`SMTP_PORT` du bloc `environment` du service `backend` dans `docker-compose.yml`.

## Production

1. **Firebase** : créer le projet, activer Authentication (Email/mot de passe + Google) et Firestore. Créer un compte de service (Paramètres > Comptes de service) et mettre son JSON dans `FIREBASE_SERVICE_ACCOUNT_JSON`. Renseigner les variables `NEXT_PUBLIC_FIREBASE_*` avec la config de l'application web, **laisser `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL` vide**. Ajouter ton domaine dans Authentication > Paramètres > Domaines autorisés. Déployer `emulators/firestore.rules` (accès client refusé : tout passe par l'API).
2. **Resend** : vérifier ton domaine d'envoi, créer une clé API, puis `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` (une adresse de ce domaine).
3. `ENV=production`, une `SECRET_KEY` aléatoire (l'API refuse de démarrer sinon), `FRONTEND_ORIGIN` et `BACKEND_PUBLIC_URL` aux vraies adresses.
4. Ne pas définir `FIRESTORE_EMULATOR_HOST` ni `FIREBASE_AUTH_EMULATOR_HOST` (l'API refuse de démarrer si c'est le cas).

## Structure

```
frontend/    Next.js : accueil, connexion, dashboard
backend/     FastAPI : routes, services (IA, emails, agenda, médias), tests
emulators/   Émulateurs Firebase (Docker), règles Firestore
```

Ne jamais commiter le fichier `.env` (il est ignoré par git).
