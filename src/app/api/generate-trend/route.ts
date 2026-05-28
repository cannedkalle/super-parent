import { GoogleGenAI, Type, type GenerateContentConfig } from '@google/genai';
import { NextResponse } from 'next/server';

import { buildTrendCardPrompt } from '@/app/pop-trends/trendPrompts';
import { POP_TREND_CATEGORIES } from '@/app/pop-trends/trendTypes';
import type { TrendCategory, TrendDraft } from '@/app/pop-trends/trendTypes';

type GeneratedTrend = TrendDraft;

interface TrendCandidateResponse {
  candidates?: GeneratedTrend[];
  ambiguityNote?: string;
  rejectedReason?: string;
}

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
  return POP_TREND_CATEGORIES.includes(value as TrendCategory) ? (value as TrendCategory) : 'Other Kid Culture';
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
    contents: buildTrendCardPrompt(title),
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
