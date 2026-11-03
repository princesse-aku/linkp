// scheduled_for est une heure locale (fuseau du profil), sans décalage : ex. 2026-11-09T09:00:00

export function dayParts(iso: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
    day: d.getDate(),
    month: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
  };
}

export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function longDate(iso: string) {
  const text = new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1); // « Lundi 9 novembre »
}
