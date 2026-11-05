import Link from "next/link";
import LegalLayout, { CONTACT_EMAIL, Callout, type LegalSection } from "@/components/legal/LegalLayout";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Confidentialité et sécurité de tes clés",
  description:
    "Comment LinkP protège tes données et tes clés API (chiffrement, accès limités), et que faire pour les révoquer et nous alerter en cas d'intrusion.",
  path: "/confidentialite",
});

const mail = (subject?: string) => `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "Qui est responsable de LinkP",
    body: (
      <>
        <p>
          LinkP est édité par <strong>Princesse ALAGNON</strong>, qui est responsable du traitement de tes données personnelles. Pour toute question sur cette
          page, sur tes données ou sur la sécurité, un seul contact : <a href={mail()}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          Cette page est écrite pour être lue. Elle décrit ce que fait réellement LinkP, pas ce qu&apos;il serait idéal de faire. Si tu y trouves une
          imprécision, dis-le nous.
        </p>
      </>
    ),
  },
  {
    id: "donnees",
    title: "Les données que nous enregistrons",
    body: (
      <>
        <ul>
          <li>
            <strong>Ton compte :</strong> adresse email et mot de passe (ou identifiant Google). Les mots de passe sont gérés par Firebase Authentication :
            LinkP ne les voit jamais et ne les stocke pas.
          </li>
          <li>
            <strong>Ton profil :</strong> nom, poste, secteur, présentation, langue, tons d&apos;écriture, thèmes, période et fréquence de publication,
            fuseau horaire.
          </li>
          <li>
            <strong>Ton contenu :</strong> les posts d&apos;exemple que tu colles, l&apos;analyse de ton style, les posts générés ou écrits, ainsi que les images
            que tu téléverses ou fais générer.
          </li>
          <li>
            <strong>Tes accès externes :</strong> ta clé API RodiumAI et, si tu l&apos;actives, l&apos;autorisation Google Agenda. Ils sont protégés comme
            expliqué dans la section suivante.
          </li>
          <li>
            <strong>Des journaux techniques :</strong> adresse IP, date et route appelée, conservés par l&apos;hébergeur pour la sécurité et le diagnostic.
            Ils ne contiennent jamais tes clés.
          </li>
        </ul>
        <p>
          LinkP ne publie rien sur LinkedIn à ta place et n&apos;a aucun accès à ton compte LinkedIn. Tu copies et publies tes posts toi-même.
        </p>
      </>
    ),
  },
  {
    id: "securite",
    title: "Comment tes clés sont sécurisées",
    body: (
      <>
        <Callout title="En bref">
          <p>
            Ta clé est chiffrée avant d&apos;être enregistrée, elle ne revient jamais dans ton navigateur, et elle n&apos;est lue que le temps d&apos;un appel à
            RodiumAI. Tu peux la supprimer à tout moment.
          </p>
        </Callout>
        <ul>
          <li>
            <strong>Chiffrement au repos.</strong> Ta clé RodiumAI et tes jetons Google Agenda sont chiffrés par nos serveurs (chiffrement authentifié Fernet,
            AES avec signature HMAC) avant d&apos;être écrits en base. Une copie de la base ne contient donc que du texte illisible.
          </li>
          <li>
            <strong>La clé de chiffrement est ailleurs.</strong> Elle n&apos;est pas dans la base de données : elle est conservée comme secret de
            l&apos;hébergeur du serveur, séparément de tes données.
          </li>
          <li>
            <strong>Elle ne revient jamais vers toi.</strong> Après l&apos;enregistrement, seuls les quatre derniers caractères sont affichés, pour que tu
            reconnaisses la clé. Elle n&apos;est jamais renvoyée au navigateur, jamais écrite dans les journaux.
          </li>
          <li>
            <strong>Utilisation limitée.</strong> La clé est déchiffrée en mémoire uniquement au moment d&apos;un appel d&apos;IA que tu as demandé, et envoyée
            uniquement à RodiumAI. Elle n&apos;est partagée avec aucun autre service.
          </li>
          <li>
            <strong>Base fermée au public.</strong> Aucun navigateur ne peut lire la base directement : les règles d&apos;accès l&apos;interdisent, seul notre
            serveur y accède, après avoir vérifié ton identité à chaque requête. Chaque utilisateur ne voit que ses propres données.
          </li>
          <li>
            <strong>Connexions chiffrées.</strong> Tout le trafic entre ton navigateur, LinkP et les services tiers passe par HTTPS.
          </li>
          <li>
            <strong>Tu gardes le contrôle.</strong> Tu peux supprimer ta clé depuis les paramètres de LinkP, et déconnecter Google Agenda à tout moment : la
            déconnexion révoque aussi l&apos;autorisation auprès de Google.
          </li>
        </ul>
        <p>
          Soyons honnêtes sur les limites : aucun système n&apos;est infaillible. Le chiffrement protège contre une fuite de la base de données, mais pas contre
          quelqu&apos;un qui prendrait le contrôle du serveur lui-même. C&apos;est pourquoi nous te donnons, juste en dessous, le moyen de rendre une clé inutile
          en quelques minutes, sans dépendre de nous.
        </p>
        <p>
          Conseil : utilise pour LinkP une clé RodiumAI dédiée, avec un plafond de dépense si ton compte le permet. Ainsi, tu peux la révoquer sans
          perturber tes autres usages.
        </p>
      </>
    ),
  },
  {
    id: "intrusion",
    title: "Intrusion ou doute : révoquer tes clés et nous alerter",
    body: (
      <>
        <Callout title="Si tu penses qu'une clé a fuité, fais ceci dans cet ordre" tone="alert">
          <ol>
            <li>
              <strong>Révoque la clé chez RodiumAI.</strong> Depuis ton compte RodiumAI, supprime ou régénère la clé. C&apos;est le geste le plus rapide : la clé
              devient inutilisable partout, immédiatement, quoi qu&apos;il arrive chez nous.
            </li>
            <li>
              <strong>Supprime-la dans LinkP.</strong> Dans les paramètres, section de ta clé, clique sur « Supprimer ». Ta copie chiffrée est effacée.
              Tu pourras en enregistrer une nouvelle ensuite.
            </li>
            <li>
              <strong>Déconnecte Google Agenda.</strong> Dans les paramètres de LinkP, déconnecte l&apos;agenda. Tu peux aussi retirer LinkP directement
              depuis{" "}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
                les autorisations de ton compte Google
              </a>
              .
            </li>
            <li>
              <strong>Change ton mot de passe</strong> LinkP (lien « Mot de passe oublié ? » sur la page de connexion) si tu as un doute sur ton compte.
            </li>
            <li>
              <strong>Préviens-nous</strong> à <a href={mail("SECURITE LinkP")}>{CONTACT_EMAIL}</a>, avec l&apos;objet « SECURITE LinkP ». Indique
              l&apos;adresse de ton compte et ce que tu as observé.
            </li>
          </ol>
        </Callout>
        <p>
          <strong>Ne nous envoie jamais ta clé ni ton mot de passe par email.</strong> Nous ne les demanderons jamais. L&apos;adresse du compte suffit pour
          enquêter.
        </p>
        <h3 className="pt-2 font-serif text-xl font-medium text-ink">Ce que nous faisons de notre côté</h3>
        <ul>
          <li>Nous accusons réception de ton message et nous traitons en priorité tout signalement de sécurité.</li>
          <li>
            Si une intrusion ou une fuite est confirmée, nous renouvelons immédiatement la clé de chiffrement, invalidons les accès concernés et corrigeons
            la faille.
          </li>
          <li>
            Nous prévenons par email les utilisateurs concernés dans les meilleurs délais, et au plus tard 72 heures après avoir pris connaissance de la
            violation. Nous leur disons ce qui est concerné et ce qu&apos;il faut faire, en premier lieu révoquer leurs clés. Si la loi l&apos;exige, nous
            informons aussi la CNIL.
          </li>
        </ul>
        <p>
          Tu as trouvé une faille ? Écris-nous avant de la divulguer. Nous répondons aux signalements de bonne foi et corrigeons au plus vite.
        </p>
      </>
    ),
  },
  {
    id: "usage",
    title: "Ce que nous faisons de tes données",
    body: (
      <>
        <p>
          Nous utilisons tes données pour une seule chose : faire fonctionner LinkP pour toi (trouver des idées, analyser ton style, rédiger et planifier tes
          posts, t&apos;envoyer les emails de service et de réinitialisation de mot de passe).
        </p>
        <ul>
          <li>Nous ne vendons pas tes données et ne les louons à personne.</li>
          <li>Nous n&apos;affichons aucune publicité et n&apos;utilisons aucun outil de mesure d&apos;audience.</li>
          <li>
            Nous n&apos;utilisons pas ton contenu pour entraîner un modèle d&apos;IA. Les textes envoyés à RodiumAI le sont avec ta clé, selon les conditions
            que tu as acceptées auprès de RodiumAI.
          </li>
        </ul>
        <p>
          Base légale (RGPD) : l&apos;exécution du service que tu demandes en créant un compte, et notre intérêt légitime à sécuriser la plateforme.
        </p>
      </>
    ),
  },
  {
    id: "google",
    title: "Google Agenda",
    body: (
      <>
        <p>
          La connexion à Google Agenda est facultative. Si tu l&apos;actives, LinkP demande la permission de créer, modifier et supprimer les événements de
          rappel de tes posts programmés (autorisation « événements » du calendrier). Il ne lit pas le reste de ton agenda pour d&apos;autres usages.
        </p>
        <p>
          L&apos;utilisation et le transfert par LinkP des informations reçues des API Google respectent la{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            politique de Google sur les données utilisateur des API
          </a>
          , y compris ses exigences d&apos;utilisation limitée : ces informations servent uniquement à créer tes rappels, ne sont ni transférées à des tiers,
          ni utilisées pour de la publicité, ni lues par des humains hors cas de sécurité ou d&apos;obligation légale.
        </p>
      </>
    ),
  },
  {
    id: "tiers",
    title: "Les services qui interviennent",
    body: (
      <>
        <p>LinkP s&apos;appuie sur des prestataires, qui ne reçoivent que ce dont ils ont besoin :</p>
        <ul>
          <li>
            <strong>Vercel</strong> : hébergement du site.
          </li>
          <li>
            <strong>FastAPI Cloud</strong> : hébergement du serveur de LinkP.
          </li>
          <li>
            <strong>Google Firebase</strong> (Authentication et Firestore) : comptes et base de données.
          </li>
          <li>
            <strong>RodiumAI</strong> : génération de texte et d&apos;images, avec ta propre clé et sous tes propres conditions avec ce service.
          </li>
          <li>
            <strong>Cloudinary</strong> : stockage des images.
          </li>
          <li>
            <strong>Resend</strong> : envoi des emails de service.
          </li>
          <li>
            <strong>Google Agenda</strong> : uniquement si tu l&apos;actives.
          </li>
        </ul>
        <p>Certains de ces prestataires sont situés hors de l&apos;Union européenne, notamment aux États-Unis.</p>
      </>
    ),
  },
  {
    id: "conservation",
    title: "Durée de conservation et suppression",
    body: (
      <>
        <p>
          Tes données sont conservées tant que ton compte existe. Tu peux à tout moment supprimer toi-même ta clé RodiumAI, déconnecter Google Agenda,
          supprimer tes posts et tes exemples.
        </p>
        <p>
          Pour fermer ton compte, écris à <a href={mail("Suppression de mon compte LinkP")}>{CONTACT_EMAIL}</a> depuis l&apos;adresse du compte : nous
          supprimons le compte et toutes les données associées (profil, posts, images, clé chiffrée, jetons) sous 30 jours. Les journaux techniques sont
          purgés par l&apos;hébergeur selon sa propre durée de rétention.
        </p>
      </>
    ),
  },
  {
    id: "droits",
    title: "Tes droits",
    body: (
      <>
        <p>
          Tu peux demander l&apos;accès à tes données, leur rectification, leur suppression, leur portabilité, ou t&apos;opposer à un traitement. Écris-nous à{" "}
          <a href={mail()}>{CONTACT_EMAIL}</a> : nous répondons dans un délai d&apos;un mois. Si tu estimes que tes droits ne sont pas respectés, tu peux saisir
          la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies et stockage local",
    body: (
      <p>
        LinkP n&apos;utilise aucun cookie publicitaire ni de suivi. Ton navigateur conserve uniquement ce qui est nécessaire : ta session de connexion
        (gérée par Firebase) et ta préférence d&apos;affichage des posts. Aucun bandeau de consentement n&apos;est donc nécessaire.
      </p>
    ),
  },
  {
    id: "changements",
    title: "Modifications de cette page",
    body: (
      <p>
        Si nous changeons la façon dont nous traitons tes données, nous mettons cette page à jour et indiquons la date en haut. Pour un changement important,
        nous te prévenons par email. Voir aussi nos{" "}
        <Link href="/conditions">conditions d&apos;utilisation</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Confidentialité et sécurité"
      title={
        <>
          Tes clés restent <em>les tiennes</em>.
        </>
      }
      intro="LinkP te demande des accès sensibles pour travailler à ta place : une clé d'IA et, si tu veux, ton agenda. Voici précisément comment nous les protégeons, et comment les révoquer en cas de problème."
      updated="5 novembre 2026"
      sections={sections}
    />
  );
}
