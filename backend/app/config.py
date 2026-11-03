from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # env_ignore_empty : une variable vide (ex. SMTP_PORT=) retombe sur la valeur par défaut
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    # Général
    env: str = "development"  # development | production
    frontend_origin: str = "http://localhost:3000"
    backend_public_url: str = "http://localhost:8000"
    secret_key: str = "dev-secret-change-me-dev-secret-change-me"  # signe l'état OAuth Google
    # Chiffre les clés RodiumAI des utilisateurs (clé Fernet). Obligatoire en production.
    encryption_key: str = ""

    # Firebase : en dev, les SDK lisent FIRESTORE_EMULATOR_HOST et FIREBASE_AUTH_EMULATOR_HOST.
    firebase_project_id: str = "demo-linkp"
    firebase_service_account_json: str = ""  # JSON inline ou chemin de fichier (production)

    # Emails : "smtp" (Mailpit/Mailtrap en dev) ou "resend" (production)
    email_provider: str = "smtp"
    email_from: str = "LinkP <no-reply@linkp.local>"
    resend_api_key: str = ""
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = False

    # RodiumAI (compatible OpenAI) : chaque utilisateur apporte sa propre clé, le serveur n'en a pas.
    rodium_api_url: str = "https://api.rodiumai.io/v1"
    rodium_model: str = "google/gemini-3.8-flash"

    # Google Agenda (OAuth)
    google_client_id: str = ""
    google_client_secret: str = ""

    # Cloudinary
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder: str = "linkp"
    max_upload_mb: int = 10

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"


settings = Settings()
