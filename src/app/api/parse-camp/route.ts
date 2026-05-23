import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

export interface ParsedCamp {
  name: string;
  provider: string;
  price: number;
  address: string;
  start_time: string;
  end_time: string;
}

// Fallback regex-based parser for when GEMINI_API_KEY is not provided
function mockParseCamp(text: string): ParsedCamp {
  const normalized = text.toLowerCase();

  // 1. Try to find a price (e.g. $550, 450 dollars, price: 300, costs 200, 350/week)
  let price = 250; // default fallback price
  const priceRegex = /(?:\$|price|cost|costs|rate)\s*([0-9,]+(?:\.[0-9]{2})?)/i;
  const priceMatch = text.match(priceRegex);
  if (priceMatch) {
    price = parseFloat(priceMatch[1].replace(/,/g, ''));
  } else {
    // Search for any 3-digit number that isn't a street number
    // We avoid capturing things that look like street numbers (e.g., preceding words or at start)
    const numbers = text.match(/\b([1-9][0-9]{2,3})\b/g);
    if (numbers) {
      // Find the first one that doesn't immediately precede a street name keyword
      for (const numStr of numbers) {
        const index = text.indexOf(numStr);
        const surroundingText = text.substring(index, index + 30).toLowerCase();
        if (!surroundingText.includes('st') && 
            !surroundingText.includes('street') && 
            !surroundingText.includes('ave') && 
            !surroundingText.includes('way') && 
            !surroundingText.includes('rd') && 
            !surroundingText.includes('road')) {
          price = parseFloat(numStr);
          break;
        }
      }
    }
  }

  // 2. Try to find times (e.g., 9:00 AM, 3:00 PM, 9am, 3pm, 9:30am, 9 to 12)
  const timeRegex = /\b([0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm|a\.m\.|p\.m\.))\b/gi;
  const times = text.match(timeRegex) || [];

  let start_time = "9:00 AM";
  let end_time = "3:00 PM";

  if (times.length >= 2 && times[0] && times[1]) {
    start_time = times[0].toUpperCase().replace(/\./g, '');
    end_time = times[1].toUpperCase().replace(/\./g, '');
  } else if (times.length === 1 && times[0]) {
    start_time = times[0].toUpperCase().replace(/\./g, '');
    // Try to guess end time if only start time found
    if (start_time.includes("8") || start_time.includes("9")) {
      end_time = "3:00 PM";
    }
  } else {
    // Try matching formats like "9 to 3" or "8 - 5"
    const numberRangeMatch = text.match(/\b([0-9]{1,2})\s*(?:to|-)\s*([0-9]{1,2})\b/i);
    if (numberRangeMatch && numberRangeMatch[1] && numberRangeMatch[2]) {
      const first = parseInt(numberRangeMatch[1]);
      const second = parseInt(numberRangeMatch[2]);
      if (first >= 7 && first <= 12) start_time = `${first}:00 AM`;
      if (second >= 1 && second <= 6) end_time = `${second}:00 PM`;
      else if (second > 12 && second <= 18) end_time = `${second - 12}:00 PM`;
    }
  }

  // 3. Try to extract provider
  let provider = "Unknown Provider";
  const providerKeywords = [
    "steve & kate", "galileo", "code ninjas", "ymca", "arena sports", 
    "microsoft", "google", "nike", "adidas", "boys & girls club", "playwell"
  ];
  for (const keyword of providerKeywords) {
    if (normalized.includes(keyword)) {
      provider = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (keyword.includes("steve")) provider = "Steve & Kate's";
      if (keyword.includes("ymca")) provider = "YMCA";
      if (keyword.includes("girls club")) provider = "Boys & Girls Club";
      break;
    }
  }

  if (provider === "Unknown Provider") {
    // Look for "by [Name]" or "run by [Name]" or "provider is [Name]"
    const providerMatch = text.match(/(?:by|run by|provider is|organization is|hosted by)\s+([A-Z][a-zA-Z\s&']+)(?:\.|,|\b)/);
    if (providerMatch && providerMatch[1]) {
      provider = providerMatch[1].trim();
    }
  }

  // 4. Try to extract name
  let name = "Summer Camp";
  // Look for "[Capitalized Words] Camp" or "Camp called [Name]"
  const campNameMatch = text.match(/([A-Z][a-zA-Z\s&']+\s+Camp)/i);
  if (campNameMatch && campNameMatch[1]) {
    name = campNameMatch[1].trim();
  } else {
    // If provider is known, make name "[Provider] Camp"
    if (provider !== "Unknown Provider") {
      name = `${provider} Camp`;
    } else {
      // Pick first 3-4 words as camp name
      const cleanText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
      const words = cleanText.split(/\s+/);
      if (words.length > 0 && words[0].toLowerCase() !== "i") {
        name = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + " Camp";
      }
    }
  }

  // 5. Try to extract address
  let address = "TBD Address";
  // Look for "at [Address]" or "located at [Address]"
  const addressMatch = text.match(/(?:at|located at|address is|location:)\s+([0-9]+\s+[A-Z][a-zA-Z0-9\s,.]+?)(?:\.|\n|starts|ends|costs|\$|\bfor\b|$)/i);
  if (addressMatch && addressMatch[1]) {
    address = addressMatch[1].trim();
  } else {
    // Regex for street patterns (e.g. 123 Main St, 456 Oak Avenue)
    const streetMatch = text.match(/\b([0-9]+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Way|Boulevard|Blvd|Court|Ct|Drive|Dr|Place|Pl)\b[^,.]*)/i);
    if (streetMatch && streetMatch[1]) {
      address = streetMatch[1].trim();
    }
  }

  return {
    name,
    provider,
    price,
    address,
    start_time,
    end_time
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = body.text;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text input parameter "text" is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Falling back to regex-based mock parser.");
      const parsed = mockParseCamp(text);
      return NextResponse.json({
        ...parsed,
        _parsedByMock: true // metadata tag indicating fallback was used
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: text,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { 
              type: Type.STRING, 
              description: 'The name of the camp (e.g. Galileo Innovation Camp, Robotics Camp)' 
            },
            provider: { 
              type: Type.STRING, 
              description: 'The company or organization hosting/providing the camp (e.g. YMCA, Galileo Learning, Code Ninjas)' 
            },
            price: { 
              type: Type.NUMBER, 
              description: 'The numerical price of the camp. Must be a clean number (e.g. 550 or 550.00). Do not include currency symbols.' 
            },
            address: { 
              type: Type.STRING, 
              description: 'The physical location address of the camp. If a city is mentioned, include that too.' 
            },
            start_time: { 
              type: Type.STRING, 
              description: 'Daily start time of the camp (e.g. 9:00 AM, 8:30 AM)' 
            },
            end_time: { 
              type: Type.STRING, 
              description: 'Daily end time of the camp (e.g. 3:00 PM, 4:00 PM)' 
            },
          },
          required: ['name', 'provider', 'price', 'address', 'start_time', 'end_time']
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error('No text content returned from the Gemini model');
    }

    const parsedData = JSON.parse(outputText) as ParsedCamp;

    // Validate type conformance
    if (
      typeof parsedData.name !== 'string' ||
      typeof parsedData.provider !== 'string' ||
      typeof parsedData.price !== 'number' ||
      typeof parsedData.address !== 'string' ||
      typeof parsedData.start_time !== 'string' ||
      typeof parsedData.end_time !== 'string'
    ) {
      throw new Error('Gemini response format did not match the required schema types');
    }

    return NextResponse.json({
      ...parsedData,
      _parsedByMock: false
    });

  } catch (error: any) {
    console.error('Error processing parse-camp API request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse camp details' },
      { status: 500 }
    );
  }
}
