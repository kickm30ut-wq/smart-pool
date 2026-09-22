export type UserRole = 'EMPLOYEE' | 'ADMIN';

export interface User {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  department: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export type LocationType =
  | 'CAMPUS'
  | 'RAILWAY_STATION'
  | 'BUS_STAND'
  | 'AIRPORT'
  | 'TECH_PARK'
  | 'OTHER';

export interface Location {
  _id: string;
  name: string;
  shortName: string;
  type: LocationType;
  description: string;
  landmark: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TripStatus =
  | 'SEARCHING'
  | 'MATCHED'
  | 'POOLED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Trip {
  _id: string;
  userId: string;
  fromLocationId: string;
  toLocationId: string;
  travelDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm (24hr)
  flexibleMinutes: 10 | 15 | 30;
  status: TripStatus;
  poolId?: string | null;
  createdAt: string;
  updatedAt: string;

  // Populated fields for UI convenience
  user?: User;
  fromLocation?: Location;
  toLocation?: Location;
  pool?: Pool;
}

export type PoolStatus = 'OPEN' | 'FULL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Pool {
  _id: string;
  fromLocationId: string;
  toLocationId: string;
  travelDate: string; // YYYY-MM-DD
  suggestedDepartureTime: string; // HH:mm
  pickupPoint: string;
  memberIds: string[];
  tripIds: string[];
  maxPassengers: number;
  estimatedFare: number;
  status: PoolStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Populated fields
  fromLocation?: Location;
  toLocation?: Location;
  members?: User[];
  creator?: User;
  trips?: Trip[];
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: 'POOL_JOIN' | 'POOL_FULL' | 'TRIP_MATCH' | 'POOL_UPDATE' | 'SYSTEM';
  poolId?: string;
  createdAt: string;
}

export interface MatchResult {
  trip: Trip;
  user: User;
  timeDifferenceMinutes: number;
  matchScore: number;
  matchQuality: 'Excellent Match' | 'Good Match' | 'Fair Match';
  existingPool?: Pool | null;
}

export interface SmartMatchResponse {
  targetTrip: Trip;
  suggestedDepartureTime: string;
  estimatedFare: number;
  farePerPerson: number;
  savingPerPerson: number;
  matches: MatchResult[];
  existingPools: Pool[];
  aiExplanation?: string;
}

export interface AnalyticsData {
  totalEmployees: number;
  tripsToday: number;
  activePools: number;
  successfulPools: number;
  totalEstimatedSavings: number;
  poolingRate: number; // percentage
  popularRoutes: { route: string; count: number; savings: number }[];
  peakTravelWindows: { timeWindow: string; count: number }[];
  popularDestinations: { name: string; count: number }[];
  dailyTrends: { date: string; trips: number; pools: number; savings: number }[];
}
