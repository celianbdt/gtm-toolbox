import type { CWSessionConfig } from "./types";

const CHANNEL_INSTRUCTIONS: Record<string, string> = {
  linkedin: `Tu generes des messages LinkedIn de prospection.
Regles specifiques LinkedIn:
- Message de connexion: max 300 caracteres
- InMail/message: max 1900 caracteres mais vise 500-800 pour l'engagement
- Commence par un hook personnalise (pas de "Cher/Chere")
- Pas de lien dans le premier message
- CTA doux (question ouverte, pas de "reserver un call")
- Chaque step est un message dans une sequence (connexion, follow-up 1, 2, etc.)`,

  "cold-email": `Tu generes des emails de prospection a froid.
Regles specifiques Cold Email:
- Sujet: max 60 caracteres, pas de majuscules excessives, pas de spam words
- Corps: 50-150 mots max, une seule idee par email
- Structure: Hook (1 phrase) → Valeur (2-3 phrases) → CTA (1 phrase)
- CTA clair et unique (une seule action demandee)
- Chaque step est un email dans la sequence (initial, follow-up 1, 2, etc.)
- Les follow-ups doivent apporter de la nouvelle valeur, pas juste relancer`,

  "cold-calling": `Tu generes des scripts d'appel de prospection.
Regles specifiques Cold Calling:
- Intro: max 15 secondes (nom, entreprise, raison de l'appel)
- Pitch: 30-45 secondes max
- Inclus des questions de decouverte
- Inclus la gestion de 2-3 objections courantes dans les notes
- CTA: proposition de next step concrete
- Chaque step est une variante ou un follow-up telephonique`,
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Ton professionnel et credible. Vocabulaire business precis. Pas de familiarite.",
  conversational: "Ton naturel et humain. Comme un message entre collegues. Contractions OK.",
  provocative: "Ton challeger. Remets en question le statu quo. Statistiques choc. Questions inconfortables.",
  educational: "Ton expert qui partage de la valeur. Insights, chiffres, frameworks. Positionne comme thought leader.",
};

export function buildGenerationPrompt(
  config: CWSessionConfig,
  context: string,
  debateSummary?: string
): string {
  const channelInstr = CHANNEL_INSTRUCTIONS[config.channel] ?? "";
  const toneInstr = TONE_INSTRUCTIONS[config.tone] ?? "";

  return `Tu es un expert en copywriting B2B et prospection outbound. Tu generes des sequences de messages de haute qualite.

## Canal
${channelInstr}

## Ton
${toneInstr}

## Contexte du workspace
${context || "Aucun contexte disponible. Base-toi uniquement sur le brief."}

## Brief
${config.brief}

${debateSummary ? `## Recommandations du debat d'agents\n${debateSummary}` : ""}

## Instructions
Genere une sequence de exactement ${config.sequence_length} message(s) pour le canal "${config.channel}".
Chaque message doit etre pret a envoyer — pas de placeholder [Nom], [Entreprise], etc.
Utilise des formulations generiques qui fonctionnent sans personnalisation.

Sois concis, impactant, et specifique. Pas de fluff.`;
}

export function buildDebatePrompt(
  config: CWSessionConfig,
  context: string
): string {
  return `Tu es dans un debat entre experts copywriting pour determiner le meilleur angle de prospection.

## Canal: ${config.channel}
## Ton souhaite: ${config.tone}
## Brief: ${config.brief}

## Contexte du workspace
${context || "Aucun contexte fourni."}

Ton role: Propose un angle de messaging unique et argumente. Challenge les idees convenues.
Sois specifique (pas de generalites type "il faut etre pertinent").
Propose des hooks concrets, des angles precis, des structures de message.`;
}

export const DEBATE_AGENTS = [
  {
    id: "cw-strategist",
    name: "Strategiste Copy",
    emoji: "🎯",
    color: "#8b5cf6",
    system_prompt: `Tu es un strategiste en copywriting B2B. Tu analyses le marche, l'ICP et les pain points pour identifier l'angle de messaging le plus impactant. Tu privilegies la differenciation et le positionnement unique. Tu penses en termes de "pourquoi maintenant" et "pourquoi nous".`,
  },
  {
    id: "cw-creative",
    name: "Creatif Direct Response",
    emoji: "✍️",
    color: "#f59e0b",
    system_prompt: `Tu es un copywriter direct response. Tu penses hooks, pattern interrupts, et curiosity gaps. Tu sais que les 5 premiers mots font 80% du travail. Tu privilegies l'emotion et l'urgence. Tu utilises des frameworks prouves (PAS, AIDA, Before-After-Bridge) adaptes au B2B.`,
  },
  {
    id: "cw-buyer",
    name: "Voix du Buyer",
    emoji: "👤",
    color: "#06b6d4",
    system_prompt: `Tu representes le buyer/prospect. Tu reagis aux propositions avec le scepticisme d'un decision maker B2B. Tu identifies ce qui sonne faux, ce qui est trop commercial, ce qui manque de credibilite. Tu sais ce qui te ferait repondre vs ignorer.`,
  },
];
