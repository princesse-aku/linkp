import { FirebaseError } from "firebase/app";

// Messages lisibles pour les erreurs de connexion Firebase (partagés par la connexion du site et celle de l'admin).
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email ou mot de passe incorrect.",
  "auth/user-not-found": "Email ou mot de passe incorrect.",
  "auth/wrong-password": "Email ou mot de passe incorrect.",
  "auth/email-already-in-use": "Un compte existe déjà avec cet email. Connecte-toi.",
  "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
  "auth/invalid-email": "Cette adresse email n'est pas valide.",
  "auth/too-many-requests": "Trop de tentatives. Réessaie dans quelques minutes.",
  "auth/network-request-failed": "Connexion impossible. Vérifie ta connexion internet.",
  "auth/popup-closed-by-user": "La fenêtre Google a été fermée avant la fin.",
  "auth/popup-blocked": "Le navigateur a bloqué la fenêtre Google. Autorise les popups.",
};

export const readableAuthError = (err: unknown) =>
  err instanceof FirebaseError ? (MESSAGES[err.code] ?? "Connexion impossible. Réessaie.") : "Une erreur est survenue.";
