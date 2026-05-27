import { GoogleGenAI, Type, type GenerateContentConfig } from '@google/genai';
import { NextResponse } from 'next/server';

type TrendCategory = 'Memes & Slang' | 'Games' | 'Shows & Music' | 'Toys & Collectibles' | 'Style' | 'Other Kid Culture';
type Familiarity = 'New to me' | 'Heard it' | 'I get it';

interface GeneratedTrend {
  title: string;
  category: TrendCategory;
  signal: string;
  meaning: string;
  parentTranslation: string;
  askPrompt: string;
  watchOut: string;
  ageBand: string;
  status: Familiarity;
}

interface TrendCandidateResponse {
  candidates?: GeneratedTrend[];
  ambiguityNote?: string;
  rejectedReason?: string;
}

const categories: TrendCategory[] = ['Memes & Slang', 'Games', 'Shows & Music', 'Toys & Collectibles', 'Style', 'Other Kid Culture'];

function fallbackTrend(title: string): GeneratedTrend {
  return {
    title,
    category: 'Memes & Slang',
    signal: 'Add where you are seeing this trend: school, games, videos, group chats, or shopping requests.',
    meaning: 'AI details are not available locally yet. Use this as a review card starter.',
    parentTranslation: 'Capture why kids care about it, what social signal it carries, and whether it is harmless, annoying, expensive, or worth a conversation.',
    askPrompt: `What does "${title}" mean to kids right now?`,
    watchOut: 'Check whether it involves spending, chat with strangers, school disruption, mature clips, or pressure to keep up.',
    ageBand: 'Kids + tweens',
    status: 'New to me',
  };
}

const trendCardSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    category: { type: Type.STRING },
    signal: { type: Type.STRING },
    meaning: { type: Type.STRING },
    parentTranslation: { type: Type.STRING },
    askPrompt: { type: Type.STRING },
    watchOut: { type: Type.STRING },
    ageBand: { type: Type.STRING },
    status: { type: Type.STRING },
  },
  required: ['title', 'category', 'signal', 'meaning', 'parentTranslation', 'askPrompt', 'watchOut', 'ageBand', 'status'],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    ambiguityNote: { type: Type.STRING },
    rejectedReason: { type: Type.STRING },
    candidates: {
      type: Type.ARRAY,
      items: trendCardSchema,
    },
  },
  required: ['candidates', 'ambiguityNote'],
};

function normalizeCategory(value: string): TrendCategory {
  return categories.includes(value as TrendCategory) ? (value as TrendCategory) : 'Other Kid Culture';
}

function normalizeTrend(candidate: GeneratedTrend, fallbackTitle: string): GeneratedTrend {
  return {
    title: candidate.title?.trim() || fallbackTitle,
    category: normalizeCategory(candidate.category),
    signal: candidate.signal?.trim() || '',
    meaning: candidate.meaning?.trim() || '',
    parentTranslation: candidate.parentTranslation?.trim() || '',
    askPrompt: candidate.askPrompt?.trim() || `What does "${fallbackTitle}" mean to kids right now?`,
    watchOut: candidate.watchOut?.trim() || '',
    ageBand: candidate.ageBand?.trim() || '',
    status: candidate.status === 'Heard it' || candidate.status === 'I get it' ? candidate.status : 'New to me',
  };
}

function cleanOptionalText(value: unknown) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'none' ? '' : trimmed;
}

function isSpecificEnough(candidate: GeneratedTrend, requestedTitle: string) {
  const titleMatchesRequest = candidate.title.trim().toLowerCase() === requestedTitle.trim().toLowerCase();
  const normalizedTitle = candidate.title.trim().toLowerCase();
  const combined = [candidate.signal, candidate.meaning, candidate.parentTranslation, candidate.watchOut].join(' ').toLowerCase();
  const vaguePatterns = [
    'various gaming ecosystems',
    'various games',
    'specific item',
    'could refer',
    'may refer',
    'might refer',
    'not a singular',
    'not universally',
    'favorite online games',
    'digital collectible or item',
    'online games or trading card games',
  ];
  const inappropriatePatterns = [
    'gambling',
    'casino',
    'betting',
    'adult-only',
    'sexual',
    'drugs',
    'crypto',
    'investment',
  ];

  if (titleMatchesRequest && vaguePatterns.some((pattern) => combined.includes(pattern))) {
    return false;
  }

  if (/\((trading card games|online games|mobile games|video games|social media)\)/i.test(normalizedTitle)) {
    return false;
  }

  if (inappropriatePatterns.some((pattern) => combined.includes(pattern))) {
    return false;
  }

  return true;
}

async function generateCandidates(ai: GoogleGenAI, title: string, useSearch: boolean) {
  const config: GenerateContentConfig = {
    temperature: 0.2,
    responseMimeType: 'application/json',
    responseSchema,
  };

  if (useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  return ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [
      'You create parent-facing flashcards about kid and teen pop-culture trends.',
      'Hard constraints:',
      '- Include any plausible kid, tween, or teen pop-culture signal, broadly defined. This includes but is not limited to school chatter, memes, games, shows, music, toys, collectibles, snack/food brand collectibles, retail giveaways, sports/playground rituals, books, crafts, apps, creator/video culture, style, shopping requests, local school fads, and phrases kids repeat.',
      '- Prefer recent and visible signals. Use whatever search/trend context is available to you, including Google Search results, Google Trends-style popularity signals, Reddit/community discussion, parent forums, game/platform pages, brand/product pages, news, or social trend coverage when applicable.',
      '- Do not claim that Google, Reddit, or trend data confirms something unless that evidence is actually available in the current generation context.',
      '- Treat the parent-entered title as a rough search query, not a precise canonical name. Check obvious singular/plural, spacing, brand, and adjacent-keyword variants before guessing. Example: "bear card" may need "bear cards", "BEAR cards", "Bear Snacks cards", "fruit roll cards", or "collectible cards".',
      '- If a Google-like result points to a brand/product collectible campaign or school trading fad, prioritize that over generic game/card guesses.',
      '- Do not include generic dictionary meanings, adult-only slang, investing/finance terms, medical meanings, animal facts, or unrelated web results unless they are clearly tied to kid pop culture.',
      '- Each candidate must name a concrete trend context rather than a broad category. If exact confirmation is weak, frame the candidate as a plausible match and avoid claiming it is confirmed.',
      '- Do not use generic candidate titles such as "Bear Card (Trading Card Games)" or "Bear Card (Online Games)". Use a specific context like "Bear Card (Pokemon TCG)" or omit that candidate.',
      '- Avoid asking the parent to clarify ambiguous terms. Do the interpretation work: create plausible, kid-relevant candidate cards and let the parent choose.',
      '- Return an empty candidates array only when there are no plausible kid-pop-culture interpretations, or the plausible interpretations are unsafe/adult/fringe enough that parents should not be offered a casual flashcard.',
      '- Be conservative about controversy, mature content, risky challenges, hate, self-harm, sexual content, drugs, or fringe internet drama. Reject or keep the watch-out sober and parent-safe.',
      '- Keep each field concise, practical, and non-alarmist.',
      'Output contract:',
      '- Return one JSON object with candidates, ambiguityNote, and rejectedReason.',
      '- candidates must be an array of separate JSON objects. Each object represents exactly one kid-pop-trend interpretation.',
      '- If the parent-entered term is ambiguous, split it into separate candidate objects. Do not combine meanings with "or", "/", "various games", "different contexts", or similar blended wording inside one card.',
      '- For ambiguous terms, make each candidate title self-disambiguating with a short context in parentheses, such as "Bear Card (Adopt Me!)" or "Bear Card (Specific Show Name)".',
      '- If exact meanings are uncertain, still return separate plausible candidate objects when they are kid-relevant and safe. Use ambiguityNote to say that the parent should pick the match they recognize.',
      '- If you cannot separate the meanings into specific, kid-relevant contexts, return candidates: [] instead of a mixed or generic card.',
      `Use the closest category for filtering: ${categories.join(', ')}. Choose "Other Kid Culture" when none of the narrower categories fit.`,
      'Return JSON only.',
      `Trend title entered by parent: ${title}`,
    ].join('\n'),
    config,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';

    if (!title) {
      return NextResponse.json({ error: 'Trend title is required.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        candidates: [fallbackTrend(title)],
        ambiguityNote: 'AI generation is not configured locally, so this is a starter card to edit.',
        rejectedReason: '',
        _generatedByAI: false,
        _groundedWithSearch: false,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    let groundedWithSearch = true;
    let response = await generateCandidates(ai, title, true).catch(async (searchError) => {
      console.warn('Search-grounded trend generation failed; retrying without search.', searchError);
      groundedWithSearch = false;
      return generateCandidates(ai, title, false);
    });

    if (!response.text) {
      throw new Error('No trend card returned.');
    }

    const parsed = JSON.parse(response.text) as TrendCandidateResponse;
    let candidates = Array.isArray(parsed.candidates)
      ? parsed.candidates.slice(0, 4).map((candidate) => normalizeTrend(candidate, title))
          .filter((candidate) => isSpecificEnough(candidate, title))
      : [];
    const ambiguityNote = cleanOptionalText(parsed.ambiguityNote);

    return NextResponse.json({
      candidates,
      ambiguityNote,
      rejectedReason:
        cleanOptionalText(parsed.rejectedReason) ||
        (candidates.length === 0
          ? `I could not find a kid-safe match for "${title}" yet.`
          : ''),
      _generatedByAI: true,
      _groundedWithSearch: groundedWithSearch,
    });
  } catch (error: any) {
    console.error('Error generating trend card:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate trend card.' }, { status: 500 });
  }
}
