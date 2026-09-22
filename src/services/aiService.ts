/**
 * AI Service Abstraction
 * Handles match explanations and demand insights.
 * 
 * Supports Anthropic Claude or Google Gemini if keys are configured,
 * with deterministic intelligent fallbacks so the app works reliably
 * out of the box in hackathons without any API key dependencies.
 */

import { Trip, User, Location } from '../types';

export interface MatchExplanationInput {
  targetTrip: Trip;
  targetUser?: User;
  matchingTrips: {
    trip: Trip;
    user: User;
    timeDifferenceMinutes: number;
    matchScore: number;
  }[];
  suggestedDepartureTime: string;
  fromLocation?: Location;
  toLocation?: Location;
}

export interface DemandInsightInput {
  route: string;
  travelDate: string;
  passengerCount: number;
  peakHour: string;
}

/**
 * Deterministic fallback generator for match explanations
 */
function deterministicMatchExplanation(input: MatchExplanationInput): string {
  const { matchingTrips, suggestedDepartureTime, fromLocation, toLocation } = input;
  const count = matchingTrips.length;
  const fromName = fromLocation?.shortName || fromLocation?.name || 'UST Campus';
  const toName = toLocation?.shortName || toLocation?.name || 'destination';

  if (count === 0) {
    return `No active coworkers have registered overlapping trips for ${fromName} → ${toName} at this time yet. Your trip is actively listed on the board, and we will alert you as soon as someone posts!`;
  }

  const names = matchingTrips.map(m => m.user.name.split(' ')[0]);
  const namesFormatted =
    names.length === 1
      ? names[0]
      : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;

  const minDiff = Math.min(...matchingTrips.map(m => m.timeDifferenceMinutes));
  const maxDiff = Math.max(...matchingTrips.map(m => m.timeDifferenceMinutes));

  const windowText = maxDiff <= 10 ? 'within 10 minutes' : `within a ${maxDiff}-minute window`;

  return `${namesFormatted} are strong matches because they are all traveling along ${fromName} → ${toName} ${windowText} of your preferred schedule. Departing at ${suggestedDepartureTime} aligns everyone for an effortless group pickup and maximum fare savings.`;
}

/**
 * Deterministic fallback for route demand insight
 */
function deterministicDemandInsight(input: DemandInsightInput): string {
  const { route, peakHour, passengerCount } = input;
  return `Friday between 5:30 PM and 6:30 PM demonstrates peak pooling demand for ${route}, with over ${passengerCount}+ colleagues commuting together. Forming pools during ${peakHour} reduces individual commute expenses by up to 66%.`;
}

export async function generateMatchExplanation(input: MatchExplanationInput): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Try Anthropic Claude API if key exists
  if (anthropicKey && anthropicKey.startsWith('sk-ant-')) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 250,
          messages: [
            {
              role: 'user',
              content: `You are an enterprise commute assistant for Smart Pooling. Write a concise, friendly 2-sentence match explanation for an employee looking to share an auto/cab.
Context:
- User is travelling from: ${input.fromLocation?.name || 'UST Campus'}
- User is travelling to: ${input.toLocation?.name || 'Trivandrum Central'}
- Suggested departure: ${input.suggestedDepartureTime}
- Matched coworkers: ${input.matchingTrips.map(m => `${m.user.name} (${m.trip.departureTime})`).join(', ')}
Explain why this is an ideal group and the benefit of leaving at ${input.suggestedDepartureTime}. Be concise and professional. Do not use quotes.`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text && text.trim().length > 15) {
          return text.trim();
        }
      }
    } catch (err) {
      console.warn('Anthropic API request failed, falling back to deterministic explanation', err);
    }
  }

  // Try Google Gemini API if key is available
  if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `You are an enterprise commute coordinator for Smart Pooling. Write a concise, 2-sentence explanation of why these coworkers are a great match for ride pooling.
Route: ${input.fromLocation?.name || 'UST Campus'} to ${input.toLocation?.name || 'Trivandrum Central'}.
Suggested pickup: ${input.suggestedDepartureTime}.
Colleagues: ${input.matchingTrips.map(m => `${m.user.name} (${m.trip.departureTime})`).join(', ')}.
Focus on route compatibility and smooth pickup timing. Keep it warm, corporate, and under 40 words.`;

      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (res.text && res.text.trim().length > 15) {
        return res.text.trim();
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic insight', err);
    }
  }

  // High quality deterministic fallback
  return deterministicMatchExplanation(input);
}

export async function generateDemandInsight(input: DemandInsightInput): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (anthropicKey && anthropicKey.startsWith('sk-ant-')) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: `Give a 1-sentence analytical corporate commute insight for route ${input.route} on ${input.travelDate} with peak ${input.peakHour}. Mention commute efficiency and savings. Keep it under 30 words.`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text && text.trim().length > 10) return text.trim();
      }
    } catch {
      // fallback
    }
  }

  if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Provide a 1-sentence analytical enterprise commute insight for route ${input.route} around ${input.peakHour}. Be crisp and under 30 words.`,
      });
      if (res.text && res.text.trim().length > 10) return res.text.trim();
    } catch {
      // fallback
    }
  }

  return deterministicDemandInsight(input);
}
