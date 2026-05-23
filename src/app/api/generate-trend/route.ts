import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

type TrendCategory = 'Memes & Slang' | 'Games' | 'Shows & Music' | 'Toys & Collectibles' | 'Style';
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

const categories: TrendCategory[] = ['Memes & Slang', 'Games', 'Shows & Music', 'Toys & Collectibles', 'Style'];

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

function normalizeCategory(value: string): TrendCategory {
  return categories.includes(value as TrendCategory) ? (value as TrendCategory) : 'Memes & Slang';
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
      return NextResponse.json({ ...fallbackTrend(title), _generatedByAI: false });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        'Create a concise parent-facing flashcard for a kid pop-culture trend.',
        'Be practical, non-alarmist, and honest. If the title is vague or unfamiliar, make uncertainty clear and write a useful review starter instead of pretending.',
        `Trend title: ${title}`,
      ].join('\n\n'),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      },
    });

    if (!response.text) {
      throw new Error('No trend card returned.');
    }

    const parsed = JSON.parse(response.text) as GeneratedTrend;
    return NextResponse.json({
      title: parsed.title?.trim() || title,
      category: normalizeCategory(parsed.category),
      signal: parsed.signal?.trim() || '',
      meaning: parsed.meaning?.trim() || '',
      parentTranslation: parsed.parentTranslation?.trim() || '',
      askPrompt: parsed.askPrompt?.trim() || `What does "${title}" mean to kids right now?`,
      watchOut: parsed.watchOut?.trim() || '',
      ageBand: parsed.ageBand?.trim() || '',
      status: parsed.status === 'Heard it' || parsed.status === 'I get it' ? parsed.status : 'New to me',
      _generatedByAI: true,
    });
  } catch (error: any) {
    console.error('Error generating trend card:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate trend card.' }, { status: 500 });
  }
}
