import express, { Request, Response } from 'express';
import {
  UserModel,
  LocationModel,
  TripModel,
  PoolModel,
  NotificationModel,
  calculateAnalytics,
  initDatabase,
  getDb,
} from './lib/db';
import {
  isTripCompatible,
  calculateSuggestedDeparture,
  getMatchQuality,
  formatTime12Hour,
} from './lib/matching';
import { getEstimatedFare, calculateFarePerPerson, calculateSavingsPerPerson } from './lib/fare';
import { generateMatchExplanation, generateDemandInsight } from './services/aiService';
import { seedDatabase } from '../scripts/seed';
import { MatchResult } from './types';

export const app = express();
app.use(express.json());

let isInitialized = false;

export async function ensureServerInitialized(): Promise<void> {
  if (isInitialized) return;
  try {
    const db = await initDatabase(false);
    if (db.users.length === 0 || db.locations.length === 0) {
      console.log('Database empty, performing initial seed...');
      seedDatabase(false);
    }
    isInitialized = true;
  } catch (err) {
    console.error('Error during database initialization:', err);
  }
}

// Middleware to ensure DB is initialized on incoming requests
app.use(async (req, res, next) => {
  if (!isInitialized) {
    await ensureServerInitialized();
  }
  next();
});

// ---------------------------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    storage: process.env.MONGODB_URI ? 'MongoDB Atlas' : 'Local Document DB',
    timestamp: new Date().toISOString(),
  });
});

// Re-seed endpoint for demo reset
app.post('/api/seed', async (req: Request, res: Response) => {
  try {
    seedDatabase(true);
    res.json({
      success: true,
      message: 'Database reset and re-seeded successfully',
      storage: process.env.MONGODB_URI ? 'MongoDB Atlas' : 'Local Document DB',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed database', details: String(err) });
  }
});

// --- Locations ---
app.get('/api/locations', (req: Request, res: Response) => {
  const onlyActive = req.query.active !== 'false';
  const locations = LocationModel.find(onlyActive ? { active: true } : undefined);
  res.json(locations);
});

app.post('/api/admin/locations', (req: Request, res: Response) => {
  const { name, shortName, type, description, landmark } = req.body;
  if (!name || !shortName || !type) {
    return res.status(400).json({ error: 'Name, shortName, and type are required' });
  }

  // Check duplicate
  const existing = LocationModel.find().find(
    l =>
      l.name.toLowerCase() === name.trim().toLowerCase() ||
      l.shortName.toLowerCase() === shortName.trim().toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: 'A location with this name or short name already exists' });
  }

  const created = LocationModel.create({
    name: name.trim(),
    shortName: shortName.trim(),
    type,
    description: description || '',
    landmark: landmark || '',
    active: true,
  });
  res.status(201).json(created);
});

app.patch('/api/admin/locations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = LocationModel.updateById(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Location not found' });
  }
  res.json(updated);
});

// --- Users & Demo Auth ---
app.get('/api/users', (req: Request, res: Response) => {
  const users = UserModel.find();
  res.json(users);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = UserModel.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// --- Trips ---
app.post('/api/trips', (req: Request, res: Response) => {
  const { userId, fromLocationId, toLocationId, travelDate, departureTime, flexibleMinutes } = req.body;

  if (!userId || !fromLocationId || !toLocationId || !travelDate || !departureTime) {
    return res.status(400).json({ error: 'All fields (from, to, date, departure time, user) are required' });
  }
  if (fromLocationId === toLocationId) {
    return res.status(400).json({ error: 'From and To locations cannot be the same destination' });
  }

  const user = UserModel.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const newTrip = TripModel.create({
    userId,
    fromLocationId,
    toLocationId,
    travelDate,
    departureTime,
    flexibleMinutes: flexibleMinutes || 15,
    status: 'SEARCHING',
  });

  res.status(201).json(newTrip);
});

app.get('/api/trips/my', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }
  const trips = TripModel.find({ userId });
  trips.sort((a, b) => (b.travelDate + b.departureTime).localeCompare(a.travelDate + a.departureTime));
  res.json(trips);
});

app.get('/api/trips/:id', (req: Request, res: Response) => {
  const trip = TripModel.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

// Smart Matching Endpoint
app.get('/api/trips/:id/matches', async (req: Request, res: Response) => {
  const { id } = req.params;
  const targetTrip = TripModel.findById(id);
  if (!targetTrip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  const allTrips = TripModel.find({
    travelDate: targetTrip.travelDate,
    fromLocationId: targetTrip.fromLocationId,
    toLocationId: targetTrip.toLocationId,
  });

  const matches: MatchResult[] = [];
  const fromLoc = LocationModel.findById(targetTrip.fromLocationId);
  const toLoc = LocationModel.findById(targetTrip.toLocationId);

  const existingPools = PoolModel.find({
    travelDate: targetTrip.travelDate,
    fromLocationId: targetTrip.fromLocationId,
    toLocationId: targetTrip.toLocationId,
  }).filter(p => p.status === 'OPEN' || p.status === 'CONFIRMED');

  for (const candidateTrip of allTrips) {
    if (candidateTrip._id === targetTrip._id || candidateTrip.userId === targetTrip.userId) {
      continue;
    }

    const candidateUser = UserModel.findById(candidateTrip.userId);
    if (!candidateUser) continue;

    const candidatePool = candidateTrip.poolId ? PoolModel.findById(candidateTrip.poolId) : null;

    const check = isTripCompatible({
      candidateTrip,
      targetTrip,
      candidateUser,
      candidatePool,
    });

    if (check.compatible) {
      matches.push({
        trip: candidateTrip,
        user: candidateUser,
        timeDifferenceMinutes: check.timeDiffMinutes,
        matchScore: check.matchScore,
        matchQuality: getMatchQuality(check.matchScore),
        existingPool: candidatePool,
      });
    }
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);

  const departureTimes = [targetTrip.departureTime, ...matches.map(m => m.trip.departureTime)];
  const suggestedDepartureTime = calculateSuggestedDeparture(departureTimes);

  const estimatedFare = getEstimatedFare(fromLoc?.name || '', toLoc?.name || '');
  const estimatedRiders = Math.min(4, 1 + matches.length);
  const farePerPerson = calculateFarePerPerson(estimatedFare, estimatedRiders);
  const savingPerPerson = calculateSavingsPerPerson(estimatedFare, estimatedRiders);

  let aiExplanation = '';
  try {
    aiExplanation = await generateMatchExplanation({
      targetTrip,
      targetUser: targetTrip.user,
      matchingTrips: matches,
      suggestedDepartureTime: formatTime12Hour(suggestedDepartureTime),
      fromLocation: fromLoc,
      toLocation: toLoc,
    });
  } catch {
    aiExplanation = `${matches.length} colleagues are traveling along your route within your flexibility window. Pooling together saves each rider up to ₹${savingPerPerson}.`;
  }

  res.json({
    targetTrip,
    suggestedDepartureTime,
    estimatedFare,
    passengerCount: estimatedRiders,
    farePerPerson,
    savingPerPerson,
    matches,
    existingPools,
    aiExplanation,
  });
});

// --- Pools ---
app.get('/api/pools', (req: Request, res: Response) => {
  const { userId, date, status } = req.query;
  let pools = PoolModel.find();
  if (userId && typeof userId === 'string') {
    pools = pools.filter(p => p.memberIds.includes(userId));
  }
  if (date && typeof date === 'string') {
    pools = pools.filter(p => p.travelDate === date);
  }
  if (status && typeof status === 'string') {
    pools = pools.filter(p => p.status === status);
  }
  res.json(pools);
});

app.get('/api/pools/:id', (req: Request, res: Response) => {
  const pool = PoolModel.findById(req.params.id);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });
  res.json(pool);
});

app.post('/api/pools', (req: Request, res: Response) => {
  const {
    tripId,
    userId,
    fromLocationId,
    toLocationId,
    travelDate,
    suggestedDepartureTime,
    pickupPoint,
    maxPassengers = 4,
    matchingTripIds = [],
  } = req.body;

  if (!userId || !fromLocationId || !toLocationId || !travelDate) {
    return res.status(400).json({ error: 'Missing required pool creation fields (userId, from, to, date)' });
  }

  const fromLoc = LocationModel.findById(fromLocationId);
  const toLoc = LocationModel.findById(toLocationId);
  const customFare = Number(req.body.estimatedFare);
  const estimatedFare = (!isNaN(customFare) && customFare > 0)
    ? customFare
    : getEstimatedFare(fromLoc?.name || '', toLoc?.name || '');

  // If no tripId provided, auto-create a trip for the pool host/creator
  let activeTripId = tripId;
  if (!activeTripId) {
    const creatorTrip = TripModel.create({
      userId,
      fromLocationId,
      toLocationId,
      travelDate,
      departureTime: suggestedDepartureTime || '18:00',
      flexibleMinutes: 15,
      status: 'POOLED',
    });
    activeTripId = creatorTrip._id;
  }

  const memberIds = [userId];
  const tripIds = [activeTripId];

  for (const mTripId of matchingTripIds) {
    const mTrip = TripModel.findById(mTripId);
    if (mTrip && !memberIds.includes(mTrip.userId) && memberIds.length < maxPassengers) {
      memberIds.push(mTrip.userId);
      tripIds.push(mTrip._id);
    }
  }

  const pool = PoolModel.create({
    fromLocationId,
    toLocationId,
    travelDate,
    suggestedDepartureTime: suggestedDepartureTime || '18:00',
    pickupPoint: pickupPoint || `${fromLoc?.shortName || 'Main Campus'} Pickup Point`,
    memberIds,
    tripIds,
    maxPassengers: Number(maxPassengers) || 4,
    estimatedFare,
    status: memberIds.length >= (Number(maxPassengers) || 4) ? 'FULL' : 'OPEN',
    createdBy: userId,
  });

  tripIds.forEach(tId => {
    TripModel.updateById(tId, { poolId: pool._id, status: 'POOLED' });
  });

  const creatorUser = UserModel.findById(userId);
  memberIds.forEach(mId => {
    if (mId !== userId) {
      NotificationModel.create({
        userId: mId,
        title: 'Added to Pool',
        message: `${creatorUser?.name || 'A coworker'} added you to a ride pool to ${toLoc?.shortName || 'destination'}.`,
        type: 'POOL_JOIN',
        poolId: pool._id,
        read: false,
      });
    }
  });

  res.status(201).json(pool);
});

// Join Pool
app.post('/api/pools/:id/join', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, tripId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const pool = PoolModel.findById(id);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }

  if (pool.status === 'FULL' || pool.memberIds.length >= pool.maxPassengers) {
    return res.status(400).json({ error: `This pool is already at full capacity (${pool.maxPassengers} riders)` });
  }

  if (pool.memberIds.includes(userId)) {
    return res.status(400).json({ error: 'You are already a member of this pool' });
  }

  // Ensure the joining user has an associated trip
  let activeTripId = tripId;
  if (!activeTripId) {
    const existingTrip = TripModel.find({
      userId,
      fromLocationId: pool.fromLocationId,
      toLocationId: pool.toLocationId,
      travelDate: pool.travelDate,
    }).find(t => t.status === 'SEARCHING');

    if (existingTrip) {
      activeTripId = existingTrip._id;
    } else {
      const newTrip = TripModel.create({
        userId,
        fromLocationId: pool.fromLocationId,
        toLocationId: pool.toLocationId,
        travelDate: pool.travelDate,
        departureTime: pool.suggestedDepartureTime,
        flexibleMinutes: 15,
        status: 'POOLED',
      });
      activeTripId = newTrip._id;
    }
  }

  const updatedMemberIds = [...pool.memberIds, userId];
  const updatedTripIds = activeTripId && !pool.tripIds.includes(activeTripId)
    ? [...pool.tripIds, activeTripId]
    : pool.tripIds;
  const newStatus = updatedMemberIds.length >= pool.maxPassengers ? 'FULL' : 'OPEN';

  const updatedPool = PoolModel.updateById(id, {
    memberIds: updatedMemberIds,
    tripIds: updatedTripIds,
    status: newStatus,
  });

  if (activeTripId) {
    TripModel.updateById(activeTripId, { poolId: id, status: 'POOLED' });
  }

  const joiningUser = UserModel.findById(userId);
  const toLoc = LocationModel.findById(pool.toLocationId);

  pool.memberIds.forEach(mId => {
    NotificationModel.create({
      userId: mId,
      title: 'New Rider Joined',
      message: `${joiningUser?.name || 'A coworker'} has joined your pool to ${toLoc?.shortName || 'destination'}! Fare per person is now ₹${calculateFarePerPerson(pool.estimatedFare, updatedMemberIds.length)}.`,
      type: updatedMemberIds.length >= pool.maxPassengers ? 'POOL_FULL' : 'POOL_JOIN',
      poolId: id,
      read: false,
    });
  });

  res.json(updatedPool);
});

// Leave Pool
app.post('/api/pools/:id/leave', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, tripId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const pool = PoolModel.findById(id);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }

  if (!pool.memberIds.includes(userId)) {
    return res.status(400).json({ error: 'You are not a member of this pool' });
  }

  const updatedMemberIds = pool.memberIds.filter(mId => mId !== userId);
  let updatedTripIds = pool.tripIds;

  if (tripId) {
    updatedTripIds = pool.tripIds.filter(tId => tId !== tripId);
    TripModel.updateById(tripId, { poolId: null, status: 'SEARCHING' });
  } else {
    const userTrips = TripModel.find({ userId, poolId: id });
    userTrips.forEach(ut => {
      TripModel.updateById(ut._id, { poolId: null, status: 'SEARCHING' });
      updatedTripIds = updatedTripIds.filter(tid => tid !== ut._id);
    });
  }

  let updatedPool;
  if (updatedMemberIds.length === 0) {
    updatedPool = PoolModel.updateById(id, {
      memberIds: [],
      tripIds: [],
      status: 'CANCELLED',
    });
  } else {
    updatedPool = PoolModel.updateById(id, {
      memberIds: updatedMemberIds,
      tripIds: updatedTripIds,
      status: 'OPEN',
    });
  }

  const leavingUser = UserModel.findById(userId);
  updatedMemberIds.forEach(mId => {
    NotificationModel.create({
      userId: mId,
      title: 'Rider Left Pool',
      message: `${leavingUser?.name || 'A coworker'} left the pool. A seat is now open.`,
      type: 'POOL_UPDATE',
      poolId: id,
      read: false,
    });
  });

  res.json(updatedPool);
});

// Update Pool
app.patch('/api/pools/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, pickupPoint, suggestedDepartureTime } = req.body;

  const updates: Partial<any> = {};
  if (status) updates.status = status;
  if (pickupPoint) updates.pickupPoint = pickupPoint;
  if (suggestedDepartureTime) updates.suggestedDepartureTime = suggestedDepartureTime;

  const updated = PoolModel.updateById(id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Pool not found' });
  }

  if (status === 'COMPLETED') {
    updated.tripIds.forEach(tId => {
      TripModel.updateById(tId, { status: 'COMPLETED' });
    });
  }

  res.json(updated);
});

// --- Notifications ---
app.get('/api/notifications', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }
  const notifs = NotificationModel.find({ userId });
  res.json(notifs);
});

app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
  const success = NotificationModel.markAsRead(req.params.id);
  res.json({ success });
});

app.post('/api/notifications/read-all', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const count = NotificationModel.markAllAsRead(userId);
  res.json({ count });
});

// --- Admin Endpoints ---
app.get('/api/admin/users', (req: Request, res: Response) => {
  const users = UserModel.find();
  res.json(users);
});

app.get('/api/admin/trips', (req: Request, res: Response) => {
  const { date, status, fromId, toId } = req.query;
  let trips = TripModel.find();
  if (date && typeof date === 'string') {
    trips = trips.filter(t => t.travelDate === date);
  }
  if (status && typeof status === 'string') {
    trips = trips.filter(t => t.status === status);
  }
  if (fromId && typeof fromId === 'string') {
    trips = trips.filter(t => t.fromLocationId === fromId);
  }
  if (toId && typeof toId === 'string') {
    trips = trips.filter(t => t.toLocationId === toId);
  }
  trips.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(trips);
});

app.get('/api/admin/pools', (req: Request, res: Response) => {
  const pools = PoolModel.find();
  pools.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(pools);
});

app.get('/api/admin/analytics', (req: Request, res: Response) => {
  const analytics = calculateAnalytics();
  res.json(analytics);
});

// --- AI Insights API ---
app.post('/api/ai/demand-insight', async (req: Request, res: Response) => {
  try {
    const { route, travelDate, passengerCount, peakHour } = req.body;
    const insight = await generateDemandInsight({
      route: route || 'UST Campus → Trivandrum Central',
      travelDate: travelDate || 'Friday',
      passengerCount: passengerCount || 4,
      peakHour: peakHour || '5:45 PM - 6:30 PM',
    });
    res.json({ insight });
  } catch {
    res.json({
      insight:
        'Friday between 5:30 PM and 6:30 PM shows the highest pooling demand for UST Campus to Trivandrum Central.',
    });
  }
});

// Default handler for Vercel Serverless Function
export default async function handler(req: any, res: any) {
  await ensureServerInitialized();
  return app(req, res);
}
