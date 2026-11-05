import Link from "next/link";
import LegalLayout, { CONTACT_EMAIL, type LegalSection } from "@/components/legal/LegalLayout";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Conditions d'utilisation",
  description: "Les règles d'utilisation de LinkP : ton compte, ta clé API, tes contenus, ce que le service fait et ne fait pas, et nos responsabilités.",
  path: "/conditions",
});

const sections: LegalSection[] = [
  {
    id: "objet",
    title: "Ce qu'est LinkP",
    body: (
      <>
        <p>
          LinkP est un outil d&apos;aide à la rédaction : il te propose des idées de sujets, apprend ton style à partir des posts que tu lui montres, rédige des
          brouillons de posts LinkedIn et les planifie, avec des rappels dans ton agenda si tu le souhaites.
        </p>
        <p>
          LinkP est édité par Princesse ALAGNON (contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>). Il n&apos;est ni affilié à LinkedIn, ni
          approuvé par LinkedIn. En créant un compte ou en utilisant LinkP, tu acceptes ces conditions.
        </p>
      </>
    ),
  },
  {
    id: "compte",
    title: "Ton compte",
    body: (
      <ul>
        <li>Tu dois fournir une adresse email valide et en avoir l&apos;usage.</li>
        <li>Tu es responsable de ton mot de passe et de ce qui se fait depuis ton compte. Choisis un mot de passe que tu n&apos;utilises nulle part ailleurs.</li>
        <li>Un compte est personnel. Ne le partage pas.</li>
        <li>Tu peux fermer ton compte à tout moment (voir la page de confidentialité).</li>
      </ul>
    ),
  },
  {
    id: "cles",
    title: "Ta clé API et tes accès externes",
    body: (
      <>
        <p>
          Pour rédiger, LinkP utilise <strong>ta propre clé RodiumAI</strong>. Les crédits consommés sont facturés par RodiumAI, sur ton compte et selon les
          conditions de RodiumAI : LinkP n&apos;en tire aucune marge et n&apos;a aucun moyen d&apos;utiliser ta clé hors de tes demandes.
        </p>
        <ul>
          <li>Tu t&apos;engages à n&apos;enregistrer que des clés dont tu es le titulaire ou que tu as le droit d&apos;utiliser.</li>
          <li>Tu restes responsable de ta clé et de ses coûts. Surveille ta consommation et, si possible, fixe un plafond chez RodiumAI.</li>
          <li>
            En cas de doute ou d&apos;intrusion, révoque ta clé sans attendre : la marche à suivre est détaillée dans notre{" "}
            <Link href="/confidentialite#intrusion">page de confidentialité et de sécurité</Link>.
          </li>
          <li>La connexion à Google Agenda est facultative et peut être retirée à tout moment.</li>
        </ul>
      </>
    ),
  },
  {
    id: "contenus",
    title: "Tes contenus et l'IA",
    body: (
      <>
        <ul>
          <li>
            <strong>Tes contenus t&apos;appartiennent.</strong> Les posts d&apos;exemple, les textes et les images que tu ajoutes ou fais générer restent à toi.
            Tu nous autorises seulement à les stocker et à les traiter pour faire fonctionner LinkP pour toi.
          </li>
          <li>
            <strong>Les textes sont générés par une IA.</strong> Ils peuvent contenir des erreurs, des approximations ou des formulations qui ne te
            conviennent pas. Relis chaque post avant de le publier.
          </li>
          <li>
            <strong>Tu es responsable de ce que tu publies.</strong> LinkP ne publie rien à ta place : tu copies et publies toi-même. Assure-toi que ce que tu
            publies est exact et respecte les droits des tiers et les règles de LinkedIn.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "usage",
    title: "Usages interdits",
    body: (
      <>
        <p>Tu t&apos;engages à ne pas utiliser LinkP pour :</p>
        <ul>
          <li>produire des contenus illégaux, trompeurs, haineux, ou portant atteinte aux droits d&apos;autrui ;</li>
          <li>perturber le service, tenter d&apos;accéder aux données d&apos;un autre utilisateur ou contourner les protections ;</li>
          <li>envoyer du spam ou automatiser des demandes de façon abusive ;</li>
          <li>utiliser une clé ou un accès volé.</li>
        </ul>
        <p>Nous pouvons suspendre un compte qui ne respecte pas ces règles, en t&apos;expliquant pourquoi quand c&apos;est possible.</p>
      </>
    ),
  },
  {
    id: "disponibilite",
    title: "Disponibilité du service",
    body: (
      <p>
        LinkP est un service jeune, fourni en l&apos;état et en constante évolution. Nous faisons de notre mieux pour qu&apos;il soit disponible et fiable, mais
        nous ne pouvons pas promettre l&apos;absence d&apos;interruption ou d&apos;erreur. Il dépend aussi de services tiers (RodiumAI, Google, hébergeurs) dont
        les pannes ou changements peuvent affecter LinkP. À ce jour, l&apos;accès à LinkP est gratuit ; si cela change, nous te préviendrons à l&apos;avance.
      </p>
    ),
  },
  {
    id: "responsabilite",
    title: "Responsabilité",
    body: (
      <>
        <p>
          Nous sommes responsables de la sécurité des données que tu nous confies, selon les moyens décrits dans la{" "}
          <Link href="/confidentialite#securite">page de confidentialité</Link>. Dans les limites permises par la loi, nous ne sommes pas responsables des
          contenus que tu choisis de publier, des résultats obtenus avec tes posts, ni des coûts facturés par des services tiers sur ta clé.
        </p>
        <p>Rien dans ces conditions ne limite les droits que la loi te reconnaît en tant que consommateur.</p>
      </>
    ),
  },
  {
    id: "evolution",
    title: "Modification, droit applicable",
    body: (
      <>
        <p>
          Nous pouvons faire évoluer ces conditions. La date de dernière mise à jour figure en haut de la page, et nous te prévenons par email en cas de
          changement important. Continuer à utiliser LinkP après une mise à jour vaut acceptation.
        </p>
        <p>
          Ces conditions sont régies par le droit français. En cas de difficulté, écris-nous d&apos;abord à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> :
          nous cherchons toujours une solution à l&apos;amiable.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Conditions d'utilisation"
      title={
        <>
          Des règles <em>simples</em> et claires.
        </>
      }
      intro="Ce que LinkP fait pour toi, ce que nous attendons de toi, et qui est responsable de quoi."
      updated="5 novembre 2026"
      sections={sections}
    />
  );
}
