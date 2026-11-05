"""Répare le texte dont l'encodage a été corrompu (« DÃ©veloppeuse » au lieu de « Développeuse »).

Cela arrive quand des octets UTF-8 sont relus comme du Latin-1 / Windows-1252 (terminal, copier-coller, script).
"""

_MARKERS = ("Ã", "Â", "â€", "Å", "Ã¢")


def fix_mojibake(text: str) -> str:
    if not isinstance(text, str) or not any(m in text for m in _MARKERS):
        return text
    for codec in ("cp1252", "latin-1"):
        try:
            repaired = text.encode(codec).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
        if repaired != text and "\ufffd" not in repaired:
            return repaired
    return text
