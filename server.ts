import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  UserModel,
  LocationModel,
  TripModel,
  PoolModel,
  NotificationModel,
  calculateAnalytics,
  getDb,
} from './src/lib/db.ts';
import {
  isTripCompatible,
  calculateSuggestedDeparture,
  getMatchQuality,
  formatTime12Hour,
} from './src/lib/matching.ts';
import { getEstimatedFare, calculateFarePerPerson, calculateSavingsPerPerson } from './src/lib/fare.ts';
import { generateMatchExplanation, generateDemandInsight } from './src/services/aiService.ts';
import { seedDatabase } from './scripts/seed.ts';
import { MatchResult } from './src/types/index.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auto-seed if database is empty on server boot
  try {
    const db = getDb();
    if (db.users.length === 0 || db.locations.length === 0) {
      console.log('Database empty, performing initial seed...');
      seedDatabase(false);
    }
  } catch (err) {
    console.error('Error checking database status:', err);
  }

  // ---------------------------------------------------------------------------
  // API ROUTES
  // ---------------------------------------------------------------------------

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Re-seed endpoint for demo reset
  app.post('/api/seed', (req: Request, res: Response) => {
    try {
      seedDatabase(true);
      res.json({ success: true, message: 'Database reset and re-seeded successfully' });
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
      l => l.name.toLowerCase() === name.trim().toLowerCase() || l.shortName.toLowerCase() === shortName.trim().toLowerCase()
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

    // Server-side validation
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
    // Sort descending by date/time
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

    // Existing pools on same route and date
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

    // Sort by match score descending (closest time first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Calculate suggested departure time
    const departureTimes = [targetTrip.departureTime, ...matches.map(m => m.trip.departureTime)];
    const suggestedDepartureTime = calculateSuggestedDeparture(departureTimes);

    // Calculate estimated fare
    const estimatedFare = getEstimatedFare(fromLoc?.name || '', toLoc?.name || '');
    const estimatedRiders = Math.min(4, 1 + matches.length);
    const farePerPerson = calculateFarePerPerson(estimatedFare, estimatedRiders);
    const savingPerPerson = calculateSavingsPerPerson(estimatedFare, estimatedRiders);

    // Generate AI or deterministic match explanation
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
      matchingTripIds = [],
    } = req.body;

    if (!tripId || !userId || !fromLocationId || !toLocationId || !travelDate) {
      return res.status(400).json({ error: 'Missing required pool creation fields' });
    }

    const fromLoc = LocationModel.findById(fromLocationId);
    const toLoc = LocationModel.findById(toLocationId);
    const estimatedFare = getEstimatedFare(fromLoc?.name || '', toLoc?.name || '');

    const memberIds = [userId];
    const tripIds = [tripId];

    // Add any matching trips specified
    for (const mTripId of matchingTripIds) {
      const mTrip = TripModel.findById(mTripId);
      if (mTrip && !memberIds.includes(mTrip.userId) && memberIds.length < 4) {
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
      maxPassengers: 4,
      estimatedFare,
      status: memberIds.length >= 4 ? 'FULL' : 'OPEN',
      createdBy: userId,
    });

    // Update associated trips
    tripIds.forEach(tId => {
      TripModel.updateById(tId, { poolId: pool._id, status: 'POOLED' });
    });

    // Send notifications to invited/added members
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
      return res.status(400).json({ error: 'This pool is already at full capacity (4 riders)' });
    }

    if (pool.memberIds.includes(userId)) {
      return res.status(400).json({ error: 'You are already a member of this pool' });
    }

    const updatedMemberIds = [...pool.memberIds, userId];
    const updatedTripIds = tripId && !pool.tripIds.includes(tripId) ? [...pool.tripIds, tripId] : pool.tripIds;
    const newStatus = updatedMemberIds.length >= pool.maxPassengers ? 'FULL' : 'OPEN';

    const updatedPool = PoolModel.updateById(id, {
      memberIds: updatedMemberIds,
      tripIds: updatedTripIds,
      status: newStatus,
    });

    if (tripId) {
      TripModel.updateById(tripId, { poolId: id, status: 'POOLED' });
    }

    const joiningUser = UserModel.findById(userId);
    const toLoc = LocationModel.findById(pool.toLocationId);

    // Notify other pool members
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
      // Find trips belonging to user in this pool
      const userTrips = TripModel.find({ userId, poolId: id });
      userTrips.forEach(ut => {
        TripModel.updateById(ut._id, { poolId: null, status: 'SEARCHING' });
        updatedTripIds = updatedTripIds.filter(tid => tid !== ut._id);
      });
    }

    let updatedPool;
    if (updatedMemberIds.length === 0) {
      // Pool is cancelled if no members left
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

  // Update Pool (e.g. Mark Completed, Update status or pickup point)
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

  // ---------------------------------------------------------------------------
  // VITE MIDDLEWARE SETUP
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Smart Pooling full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
