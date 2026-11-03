"""Envoi d'emails : SMTP (Mailpit/Mailtrap en dev) ou Resend (production)."""
import html
import smtplib
from email.message import EmailMessage

import httpx

from ..config import settings


class EmailError(Exception):
    pass


def send_email(to: str, subject: str, html_body: str, text_body: str) -> None:
    if settings.email_provider == "resend":
        _send_resend(to, subject, html_body, text_body)
    else:
        _send_smtp(to, subject, html_body, text_body)


def _send_resend(to: str, subject: str, html_body: str, text_body: str) -> None:
    if not settings.resend_api_key:
        raise EmailError("Resend n'est pas configuré (RESEND_API_KEY manquante).")
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [to], "subject": subject, "html": html_body, "text": text_body},
            timeout=15,
        )
    except httpx.HTTPError as exc:
        raise EmailError(f"Resend injoignable : {exc}") from exc
    if r.status_code >= 400:
        raise EmailError(f"Resend a répondu {r.status_code} : {r.text[:200]}")


def _send_smtp(to: str, subject: str, html_body: str, text_body: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.email_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_starttls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailError(f"Envoi SMTP impossible : {exc}") from exc


def _layout(title: str, paragraphs: list[str], cta_label: str | None = None, cta_url: str | None = None) -> str:
    body = "".join(f'<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3b342d">{html.escape(p)}</p>' for p in paragraphs)
    button = ""
    if cta_label and cta_url:
        button = (
            f'<p style="margin:28px 0"><a href="{html.escape(cta_url, quote=True)}" '
            'style="background:#C8502D;color:#ffffff;text-decoration:none;padding:14px 28px;'
            f'border-radius:999px;font-weight:600;display:inline-block">{html.escape(cta_label)}</a></p>'
            f'<p style="margin:0;font-size:13px;color:#8a8076">Si le bouton ne fonctionne pas, copie ce lien :<br>'
            f'<span style="word-break:break-all">{html.escape(cta_url)}</span></p>'
        )
    return (
        '<div style="background:#FAF5EC;padding:32px 16px;font-family:Georgia,serif">'
        '<div style="max-width:520px;margin:0 auto;background:#FFFDF8;border:1px solid #E4D9C8;padding:32px">'
        '<p style="margin:0 0 24px;font-size:24px;font-weight:600;color:#1D1A16">Link<span style="color:#C8502D">P</span></p>'
        f'<h1 style="margin:0 0 20px;font-size:24px;color:#1D1A16">{html.escape(title)}</h1>'
        f'<div style="font-family:Arial,sans-serif">{body}{button}</div>'
        "</div></div>"
    )


def welcome_email(name: str | None, verify_url: str | None) -> tuple[str, str, str]:
    hello = f"Bonjour {name}," if name else "Bonjour,"
    paragraphs = [hello, "Bienvenue sur LinkP : plus de page blanche pour tes posts LinkedIn."]
    text = f"{hello}\n\nBienvenue sur LinkP."
    cta_label = None
    if verify_url:
        paragraphs.append("Confirme ton adresse email pour sécuriser ton compte.")
        cta_label = "Confirmer mon adresse"
        text += f"\n\nConfirme ton adresse : {verify_url}"
    return "Bienvenue sur LinkP", _layout("Bienvenue sur LinkP", paragraphs, cta_label, verify_url), text


def verification_email(verify_url: str) -> tuple[str, str, str]:
    paragraphs = ["Confirme ton adresse email pour sécuriser ton compte LinkP."]
    text = f"Confirme ton adresse email : {verify_url}"
    return "Confirme ton adresse email", _layout("Confirme ton adresse", paragraphs, "Confirmer", verify_url), text


def password_reset_email(reset_url: str) -> tuple[str, str, str]:
    paragraphs = [
        "Tu as demandé à réinitialiser ton mot de passe LinkP.",
        "Si ce n'est pas toi, ignore simplement cet email.",
    ]
    text = f"Réinitialise ton mot de passe : {reset_url}\n\nSi ce n'est pas toi, ignore cet email."
    return (
        "Réinitialisation de ton mot de passe",
        _layout("Nouveau mot de passe", paragraphs, "Choisir un nouveau mot de passe", reset_url),
        text,
    )
