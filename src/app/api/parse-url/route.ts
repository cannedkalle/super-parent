import { NextResponse } from 'next/server';

export interface ScrapedCampData {
  title: string;
  provider: string;
  price: number | null;
  location: string | null;
  notes: string;
  registration_url: string;
}

/**
 * Returns mock data for test domains or placeholders if fetch fails or is blocked.
 */
function getMockDataForUrl(url: string): ScrapedCampData {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch (e) {
    hostname = url.toLowerCase();
  }

  if (hostname.includes('steveandkates') || hostname.includes('steveandkate')) {
    return {
      title: "Steve & Kate's Summer Camp",
      provider: "Steve & Kate's",
      price: 550.00,
      location: "123 Main St, Seattle, WA",
      notes: "Flexible summer camp where kids choose their own activities, including robotics, sewing, bakery, film, and sports. Register for single days or the whole summer.",
      registration_url: url
    };
  }

  if (hostname.includes('galileo') || hostname.includes('campgalileo')) {
    return {
      title: "Galileo Summer Innovation Camp",
      provider: "Galileo Learning",
      price: 620.00,
      location: "456 Oak Ave, Bellevue, WA",
      notes: "Engaging STEM, art, and innovation programs. Kids collaborate on building projects, scientific experiments, and creative designs.",
      registration_url: url
    };
  }

  if (hostname.includes('codeninjas')) {
    return {
      title: "Code Ninjas Game Design & Robotics Camp",
      provider: "Code Ninjas",
      price: 450.00,
      location: "789 Pine Rd, Kirkland, WA",
      notes: "Fun half-day and full-day camps teaching kids Scratch, Python, Roblox, Minecraft modding, and LEGO robotics.",
      registration_url: url
    };
  }

  if (hostname.includes('ymca')) {
    return {
      title: "YMCA Summer Adventure Camp",
      provider: "YMCA",
      price: 320.00,
      location: "101 Broadway, Seattle, WA",
      notes: "Classic summer outdoor and indoor activities, swimming lessons, arts & crafts, group games, and field trips. Scholarships available.",
      registration_url: url
    };
  }

  if (hostname.includes('arenasports')) {
    return {
      title: "Arena Sports Summer Soccer & Fun Camp",
      provider: "Arena Sports",
      price: 490.00,
      location: "202 Arena Way, Redmond, WA",
      notes: "High-energy indoor sports camp focused on soccer, dodgeball, laser tag, inflatable play, and team-building games.",
      registration_url: url
    };
  }

  // General fallback placeholder
  let providerName = 'Unknown Provider';
  const parts = hostname.replace('www.', '').split('.');
  if (parts.length > 0 && parts[0]) {
    providerName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  return {
    title: `${providerName} Summer Camp Program`,
    provider: providerName,
    price: 395.00,
    location: null,
    notes: `Summer program and activities hosted by ${providerName}. Visit the registration link for full schedule details and enrollment dates.`,
    registration_url: url
  };
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
    const parsed = extractMetadata(html, urlStr);

    return NextResponse.json({
      ...parsed,
      _parsedFromFetch: true
    });

  } catch (error: any) {
    console.warn(`Direct fetch to "${urlStr}" failed or timed out. Falling back to mock scraper:`, error.message);
    const fallbackData = getMockDataForUrl(urlStr);
    return NextResponse.json({
      ...fallbackData,
      _parsedFromFetch: false,
      _error: error.message
    });
  }
}
