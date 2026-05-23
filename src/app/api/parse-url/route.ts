import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

export interface ScrapedCampData {
  title: string;
  provider: string;
  price: number | null;
  location: string | null;
  start_time?: string | null;
  end_time?: string | null;
  min_age?: number | null;
  max_age?: number | null;
  min_grade?: string | null;
  max_grade?: string | null;
  is_multiple_camps?: boolean;
  ambiguity_reason?: string | null;
  notes: string;
  registration_url: string;
}

/**
 * Returns a conservative placeholder if fetch fails or is blocked.
 */
function getFallbackDataForUrl(url: string): ScrapedCampData {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch (e) {
    hostname = url.toLowerCase();
  }

  let providerName = 'Unknown Provider';
  const parts = hostname.replace('www.', '').split('.');
  if (parts.length > 0 && parts[0]) {
    providerName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  return {
    title: `${providerName} Summer Camp Program`,
    provider: providerName,
    price: null,
    location: null,
    start_time: null,
    end_time: null,
    min_age: null,
    max_age: null,
    min_grade: null,
    max_grade: null,
    is_multiple_camps: false,
    ambiguity_reason: null,
    notes: `Could not read this page automatically. Review the original link for schedule, pricing, and registration details.`,
    registration_url: url
  };
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18000);
}

function normalizeImportedData(data: Partial<ScrapedCampData>, url: string): ScrapedCampData {
  return {
    title: data.title?.trim() || 'Camp Details',
    provider: data.provider?.trim() || 'Unknown Provider',
    price: typeof data.price === 'number' && Number.isFinite(data.price) ? data.price : null,
    location: data.location?.trim() || null,
    start_time: data.start_time?.trim() || null,
    end_time: data.end_time?.trim() || null,
    min_age: typeof data.min_age === 'number' && Number.isFinite(data.min_age) ? data.min_age : null,
    max_age: typeof data.max_age === 'number' && Number.isFinite(data.max_age) ? data.max_age : null,
    min_grade: data.min_grade?.trim() || null,
    max_grade: data.max_grade?.trim() || null,
    is_multiple_camps: Boolean(data.is_multiple_camps),
    ambiguity_reason: data.ambiguity_reason?.trim() || null,
    notes: data.notes?.trim() || '',
    registration_url: data.registration_url || url,
  };
}

async function extractWithAI(html: string, url: string, metadata: ScrapedCampData): Promise<ScrapedCampData | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const text = htmlToText(html);
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [
      'Extract summer camp details from this webpage text. Return only facts stated or strongly implied by the page. Use null for unknown fields. Times should look like "9:00 AM". Price should be a number for one week/session when clear. If the page lists multiple distinct camps, sessions, locations, or program options instead of one specific camp, set is_multiple_camps to true and explain briefly in ambiguity_reason.',
      `URL: ${url}`,
      `Existing metadata: ${JSON.stringify(metadata)}`,
      `Page text: ${text}`,
    ].join('\n\n'),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          provider: { type: Type.STRING },
          price: { type: Type.NUMBER, nullable: true },
          location: { type: Type.STRING, nullable: true },
          start_time: { type: Type.STRING, nullable: true },
          end_time: { type: Type.STRING, nullable: true },
          min_age: { type: Type.NUMBER, nullable: true },
          max_age: { type: Type.NUMBER, nullable: true },
          min_grade: { type: Type.STRING, nullable: true },
          max_grade: { type: Type.STRING, nullable: true },
          is_multiple_camps: { type: Type.BOOLEAN },
          ambiguity_reason: { type: Type.STRING, nullable: true },
          notes: { type: Type.STRING },
        },
        required: ['title', 'provider', 'price', 'location', 'start_time', 'end_time', 'min_age', 'max_age', 'min_grade', 'max_grade', 'is_multiple_camps', 'ambiguity_reason', 'notes'],
      },
    },
  });

  if (!response.text) return null;
  return normalizeImportedData(JSON.parse(response.text), url);
}

/**
 * Parses title, OpenGraph tags, meta tags, and JSON-LD from HTML.
 */
function extractMetadata(html: string, url: string): ScrapedCampData {
  const decodeHtml = (str: string): string => {
    return str
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  const getMetaTag = (htmlText: string, nameOrProperty: string): string | null => {
    const regex1 = new RegExp(`<meta[^>]*?(?:name|property)=["']${nameOrProperty}["'][^>]*?content=["']([^"']*)["']`, 'i');
    const match1 = htmlText.match(regex1);
    if (match1) return decodeHtml(match1[1]);

    const regex2 = new RegExp(`<meta[^>]*?content=["']([^"']*)["'][^>]*?(?:name|property)=["']${nameOrProperty}["']`, 'i');
    const match2 = htmlText.match(regex2);
    if (match2) return decodeHtml(match2[1]);

    return null;
  };

  // 1. Get title
  let title = '';
  const ogTitle = getMetaTag(html, 'og:title') || getMetaTag(html, 'twitter:title');
  if (ogTitle) {
    title = ogTitle;
  } else {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      title = decodeHtml(titleMatch[1]);
    }
  }

  // 2. Get description/notes
  let notes = '';
  const ogDesc = getMetaTag(html, 'og:description') || getMetaTag(html, 'twitter:description') || getMetaTag(html, 'description');
  if (ogDesc) {
    notes = ogDesc;
  }

  // 3. Try to extract provider
  let provider = '';
  const ogSiteName = getMetaTag(html, 'og:site_name');
  if (ogSiteName) {
    provider = ogSiteName;
  } else {
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.replace('www.', '').split('.');
      if (parts.length > 0 && parts[0]) {
        provider = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    } catch (e) {
      provider = 'Unknown Provider';
    }
  }

  // 4. Try to parse JSON-LD schemas for richer data
  let price: number | null = null;
  let location: any = null;

  try {
    const jsonLdRegex = /<script[^>]*?type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1].trim());
        
        const searchJsonLd = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;

          // Look for price
          if (obj.offers) {
            const offers = Array.isArray(obj.offers) ? obj.offers : [obj.offers];
            for (const offer of offers) {
              if (offer.price) {
                const parsedPrice = parseFloat(offer.price);
                if (!isNaN(parsedPrice)) price = parsedPrice;
              }
            }
          }
          if (obj.price) {
            const parsedPrice = parseFloat(obj.price);
            if (!isNaN(parsedPrice)) price = parsedPrice;
          }

          // Look for location/address
          if (obj.location) {
            if (typeof obj.location === 'string') {
              location = obj.location;
            } else if (obj.location.address) {
              const addr = obj.location.address;
              if (typeof addr === 'string') {
                location = addr;
              } else if (typeof addr === 'object') {
                const parts = [
                  addr.streetAddress,
                  addr.addressLocality,
                  addr.addressRegion,
                  addr.postalCode
                ].filter(Boolean);
                if (parts.length > 0) location = parts.join(', ');
              }
            } else if (obj.location.name) {
              location = obj.location.name;
            }
          }

          // Look for provider name
          if (obj.provider && obj.provider.name) {
            provider = obj.provider.name;
          } else if (obj.organizer && obj.organizer.name) {
            provider = obj.organizer.name;
          }

          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              searchJsonLd(obj[key]);
            }
          }
        };

        searchJsonLd(json);
      } catch (e) {
        // ignore JSON parsing issues in script tag
      }
    }
  } catch (e) {
    // ignore
  }

  // 5. Fallback heuristics if JSON-LD is missing
  if (price === null) {
    // Match things like "$550" or "price: 450"
    const priceRegex = /(?:\$|price|cost|costs|rate)\s*([0-9]+(?:\.[0-9]{2})?)/i;
    const priceMatch = html.match(priceRegex);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
    }
  }

  if (!title) {
    title = 'Camp Details';
  }

  return {
    title: title.trim(),
    provider: provider.trim() || 'Unknown Provider',
    price,
    location: location ? location.trim() : null,
    notes: notes.trim(),
    registration_url: url
  };
}

export async function POST(request: Request) {
  let urlStr = '';
  try {
    const body = await request.json().catch(() => ({}));
    urlStr = body.url;

    if (!urlStr || typeof urlStr !== 'string') {
      return NextResponse.json(
        { error: 'URL input parameter "url" is required.' },
        { status: 400 }
      );
    }

    // Standardize URL schema
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr;
    }

    // Try fetching the website with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const metadataParsed = extractMetadata(html, urlStr);
    let parsed = metadataParsed;
    let parsedByAI = false;

    try {
      const aiParsed = await extractWithAI(html, urlStr, metadataParsed);
      if (aiParsed) {
        parsed = aiParsed;
        parsedByAI = true;
      }
    } catch (aiError: any) {
      console.warn(`AI extraction failed for "${urlStr}". Using metadata parser:`, aiError.message);
    }

    return NextResponse.json({
      ...parsed,
      _parsedFromFetch: true,
      _parsedByAI: parsedByAI
    });

  } catch (error: any) {
    console.warn(`Direct fetch to "${urlStr}" failed or timed out. Returning conservative fallback:`, error.message);
    const fallbackData = getFallbackDataForUrl(urlStr);
    return NextResponse.json({
      ...fallbackData,
      _parsedFromFetch: false,
      _parsedByAI: false,
      _error: error.message
    });
  }
}
