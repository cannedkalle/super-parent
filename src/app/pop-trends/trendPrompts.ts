import { POP_TREND_CATEGORIES } from './trendTypes';

const CATEGORY_RULE = `Use the closest category for filtering: ${POP_TREND_CATEGORIES.join(', ')}. Choose "Other Kid Culture" when none of the narrower categories fit.`;

export const POP_TREND_SHARED_RULES = [
  'You create parent-facing flashcards about kid and teen pop-culture trends.',
  'Write for busy parents: concrete, practical, non-alarmist, and culturally fluent without sounding like a teen.',
  'The unit of output is one concrete kid-pop-culture context, not a broad topic cluster.',
  'Prefer recent and visible signals from school chatter, memes, games, shows, music, toys, collectibles, snack/food brand collectibles, retail giveaways, sports/playground rituals, books, crafts, apps, creator/video culture, style, shopping requests, local school fads, and phrases kids repeat.',
  'Use available evidence from search, trend context, Reddit/community discussion, parent forums, game/platform pages, brand/product pages, news, social trend coverage, or first-party product pages when applicable.',
  'Do not claim that Google, Reddit, trend data, or community chatter confirms something unless that evidence is actually available in the generation context.',
  'If exact confirmation is weak but the interpretation is kid-relevant and safe, frame it as a plausible match instead of pretending certainty.',
  'Avoid generic dictionary meanings, adult-only slang, investing/finance terms, medical meanings, animal facts, or unrelated web results unless they are clearly tied to kid pop culture.',
  'Be conservative about controversy, mature content, risky challenges, hate, self-harm, sexual content, drugs, or fringe internet drama. Reject unsafe casual cards, or keep the watch-out sober and parent-safe.',
  'Keep every field concise. Do not use hype, panic, moralizing, slang cosplay, or marketing copy.',
  CATEGORY_RULE,
];

export const POP_TREND_CARD_FIELD_RULES = [
  'title: a short recognizable trend name. Add a parenthetical only when needed to disambiguate.',
  'category: exactly one allowed category.',
  'signal: what a parent might literally notice kids saying, watching, playing, wearing, collecting, requesting, or repeating.',
  'meaning: why it matters socially or behaviorally to kids.',
  'parentTranslation: the plain-English parent read on the trend, with the “why kids care” made explicit.',
  'askPrompt: one natural question a parent can ask a kid. It should invite explanation, not interrogation.',
  'watchOut: one practical, proportional thing to monitor, such as spending, chat, school disruption, mature clips, scarcity pressure, body image, or overstimulation.',
  'ageBand: a compact band such as Kids, Tweens, Teens, Kids + tweens, Elementary + tweens, or Tweens + teens.',
  'status: default to "New to me" for generated/public-feed cards unless the user has locally reviewed it.',
];

export const POP_TREND_JSON_RULES = [
  'Return JSON only.',
  'Do not include markdown, citations, prose outside JSON, or trailing commentary.',
  'Each card object must include title, category, signal, meaning, parentTranslation, askPrompt, watchOut, ageBand, and status.',
];

export function buildTrendCardPrompt(title: string) {
  return [
    ...POP_TREND_SHARED_RULES,
    'Manual build-card behavior:',
    '- Treat the parent-entered title as a rough search query, not a precise canonical name. Check obvious singular/plural, spacing, brand, and adjacent-keyword variants before guessing.',
    '- If a Google-like result points to a brand/product collectible campaign or school trading fad, prioritize that over generic game/card guesses.',
    '- If the term is ambiguous, split it into separate candidate objects. Do not combine meanings with "or", "/", "various games", "different contexts", or similar blended wording inside one card.',
    '- Make ambiguous candidate titles self-disambiguating with a short context in parentheses, such as "Bear Card (Adopt Me!)" or "Bear Card (Specific Show Name)".',
    '- Do not use generic candidate titles such as "Bear Card (Trading Card Games)" or "Bear Card (Online Games)". Use a specific context or omit that candidate.',
    '- Avoid asking the parent to clarify ambiguous terms. Do the interpretation work and let the parent choose.',
    '- Return an empty candidates array only when there are no plausible kid-pop-culture interpretations, or the plausible interpretations are unsafe/adult/fringe enough that parents should not be offered a casual flashcard.',
    'Output contract:',
    '- Return one JSON object with candidates, ambiguityNote, and rejectedReason.',
    '- candidates must be an array of separate JSON objects. Each object represents exactly one kid-pop-trend interpretation.',
    '- If you cannot separate the meanings into specific, kid-relevant contexts, return candidates: [] instead of a mixed or generic card.',
    ...POP_TREND_CARD_FIELD_RULES.map((rule) => `- ${rule}`),
    ...POP_TREND_JSON_RULES.map((rule) => `- ${rule}`),
    `Trend title entered by parent: ${title}`,
  ].join('\n');
}

export function buildDailyDigestPrompt(isoDate: string, cardCount = 3) {
  return [
    ...POP_TREND_SHARED_RULES,
    'Scheduled daily digest behavior:',
    `- Produce exactly ${cardCount} public-feed cards for ${isoDate}.`,
    '- Favor trends with fresh evidence or renewed visibility today, but avoid duplicating recent digest cards unless the trend has a distinct new angle.',
    '- Prefer a varied mix across categories when the evidence supports it.',
    '- Each selected trend should be useful as a standalone parent flashcard and should be suitable to paste into dailyFeedHistory.ts after validation.',
    '- Use updated: "Public feed" for each generated card.',
    'Output contract:',
    '- Return one JSON object with isoDate, displayDate, date, and trends.',
    '- trends must be an array of card objects using the same field meanings and tone as manual build-card output.',
    ...POP_TREND_CARD_FIELD_RULES.map((rule) => `- ${rule}`),
    ...POP_TREND_JSON_RULES.map((rule) => `- ${rule}`),
  ].join('\n');
}
