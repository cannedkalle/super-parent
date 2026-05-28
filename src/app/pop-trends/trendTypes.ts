export type TrendCategory =
  | 'Memes & Slang'
  | 'Games'
  | 'Shows & Music'
  | 'Toys & Collectibles'
  | 'Style'
  | 'Other Kid Culture';

export type Familiarity = 'New to me' | 'Heard it' | 'I get it';

export const POP_TREND_CATEGORIES: TrendCategory[] = [
  'Memes & Slang',
  'Games',
  'Shows & Music',
  'Toys & Collectibles',
  'Style',
  'Other Kid Culture',
];

export const POP_TREND_STATUSES: Familiarity[] = ['New to me', 'Heard it', 'I get it'];

export interface TrendCard {
  id: string;
  title: string;
  category: TrendCategory;
  signal: string;
  meaning: string;
  parentTranslation: string;
  askPrompt: string;
  watchOut: string;
  ageBand: string;
  status: Familiarity;
  pinned: boolean;
  updated: string;
}

export interface DailyFeedEntry {
  id: string;
  isoDate: string;
  date: string;
  displayDate: string;
  trends: TrendCard[];
}

export type TrendDraft = Omit<TrendCard, 'id' | 'pinned' | 'updated'>;
