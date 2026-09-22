/**
 * Fare Calculation Utility for Smart Pooling
 */

export interface FareCalculation {
  estimatedFare: number;
  members: number;
  farePerPerson: number;
  savingPerPerson: number;
}

// Known route fares (in Indian Rupees INR)
const ROUTE_FARES: Record<string, number> = {
  // Key format: "From::To" (lowercased)
  'ust campus::trivandrum central railway station': 180,
  'ust campus::trivandrum central': 180,
  'ust campus::thampanoor bus stand': 180,
  'ust campus::thampanoor': 180,
  'ust campus::trivandrum international airport': 250,
  'ust campus::airport': 250,
  'ust campus::kazhakkoottam': 150,
  'technopark::trivandrum central railway station': 170,
  'technopark::thampanoor bus stand': 170,
  'technopark::trivandrum international airport': 240,
  'technopark::kazhakkoottam': 120,
};

export const DEFAULT_FALLBACK_FARE = 200;

export function getEstimatedFare(fromName: string = '', toName: string = ''): number {
  const cleanFrom = fromName.trim().toLowerCase();
  const cleanTo = toName.trim().toLowerCase();

  // Try direct lookup
  const key1 = `${cleanFrom}::${cleanTo}`;
  if (ROUTE_FARES[key1]) return ROUTE_FARES[key1];

  // Try reverse lookup
  const key2 = `${cleanTo}::${cleanFrom}`;
  if (ROUTE_FARES[key2]) return ROUTE_FARES[key2];

  // Partial match heuristics
  for (const [route, fare] of Object.entries(ROUTE_FARES)) {
    const [rFrom, rTo] = route.split('::');
    if (
      (cleanFrom.includes(rFrom) || rFrom.includes(cleanFrom)) &&
      (cleanTo.includes(rTo) || rTo.includes(cleanTo))
    ) {
      return fare;
    }
  }

  return DEFAULT_FALLBACK_FARE;
}

/**
 * Calculates per-person fare when splitting an auto/taxi fare
 */
export function calculateFarePerPerson(estimatedFare: number, numberOfMembers: number): number {
  if (numberOfMembers <= 0) return estimatedFare;
  return Math.round(estimatedFare / numberOfMembers);
}

/**
 * Calculates per-person savings compared to traveling solo
 */
export function calculateSavingsPerPerson(estimatedFare: number, numberOfMembers: number): number {
  if (numberOfMembers <= 1) return 0;
  const farePerPerson = calculateFarePerPerson(estimatedFare, numberOfMembers);
  return Math.max(0, estimatedFare - farePerPerson);
}

export function computeFareBreakdown(estimatedFare: number, members: number): FareCalculation {
  const validMembers = Math.max(1, members);
  const farePerPerson = calculateFarePerPerson(estimatedFare, validMembers);
  const savingPerPerson = calculateSavingsPerPerson(estimatedFare, validMembers);

  return {
    estimatedFare,
    members: validMembers,
    farePerPerson,
    savingPerPerson,
  };
}
