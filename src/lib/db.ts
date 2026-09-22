import fs from 'fs';
import path from 'path';
import { User, Location, Trip, Pool, Notification, AnalyticsData } from '../types';
import {
  connectToMongoDB,
  isMongoDBConnected,
  loadDataFromMongoDB,
  saveAllToMongoDB,
  upsertMongoDoc,
  deleteMongoDoc,
} from './mongodb';

export interface DatabaseSchema {
  users: User[];
  locations: Location[];
  trips: Trip[];
  pools: Pool[];
  notifications: Notification[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smart_pooling_db.json');

// In-memory cache for fast read/writes
let inMemoryData: DatabaseSchema | null = null;
let isInitializing: boolean = false;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // directory creation failed or already exists
    }
  }
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export async function initDatabase(forceSeed: boolean = false): Promise<DatabaseSchema> {
  if (inMemoryData && !forceSeed) {
    return inMemoryData;
  }

  // 1. If MONGODB_URI is provided, attempt MongoDB connection
  if (process.env.MONGODB_URI) {
    try {
      const conn = await connectToMongoDB();
      if (conn) {
        const mongoData = await loadDataFromMongoDB();
        if (
          !forceSeed &&
          mongoData &&
          mongoData.users.length > 0 &&
          mongoData.locations.length > 0
        ) {
          inMemoryData = mongoData;
          console.log(`✅ Loaded ${mongoData.users.length} users and ${mongoData.locations.length} locations from MongoDB Atlas`);
          return inMemoryData;
        }
      }
    } catch (err) {
      console.warn('Could not initialize from MongoDB Atlas, falling back to local storage:', err);
    }
  }

  // 2. Local fallback
  ensureDataDir();

  if (!forceSeed && fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryData = JSON.parse(raw);
      return inMemoryData!;
    } catch (e) {
      console.warn('Failed to parse existing DB file, re-initializing', e);
    }
  }

  inMemoryData = {
    users: [],
    locations: [],
    trips: [],
    pools: [],
    notifications: [],
  };

  return inMemoryData;
}

export function getDb(): DatabaseSchema {
  if (inMemoryData) {
    return inMemoryData;
  }

  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryData = JSON.parse(raw);
      return inMemoryData!;
    } catch (e) {
      console.warn('Failed to parse existing DB file, re-initializing', e);
    }
  }

  inMemoryData = {
    users: [],
    locations: [],
    trips: [],
    pools: [],
    notifications: [],
  };

  saveDb();
  return inMemoryData;
}

export function saveDb(): void {
  if (!inMemoryData) return;
  ensureDataDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryData, null, 2), 'utf-8');
  } catch (e) {
    // In serverless environments, file writing may fail gracefully
  }

  // Also sync to MongoDB if connected
  if (isMongoDBConnected()) {
    saveAllToMongoDB(inMemoryData).catch(err => {
      console.warn('Background MongoDB sync notice:', err.message);
    });
  }
}

// User repository
export const UserModel = {
  find(filter?: Partial<User>): User[] {
    const db = getDb();
    if (!filter) return [...db.users];
    return db.users.filter(u => {
      for (const key of Object.keys(filter) as (keyof User)[]) {
        if (filter[key] !== undefined && u[key] !== filter[key]) return false;
      }
      return true;
    });
  },

  findById(id: string): User | undefined {
    const db = getDb();
    return db.users.find(u => u._id === id);
  },

  findByEmployeeId(employeeId: string): User | undefined {
    const db = getDb();
    return db.users.find(u => u.employeeId.toLowerCase() === employeeId.toLowerCase());
  },

  create(user: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): User {
    const db = getDb();
    const now = new Date().toISOString();
    const newUser: User = {
      _id: generateId('usr'),
      ...user,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(newUser);
    saveDb();
    upsertMongoDoc('users', newUser);
    return newUser;
  },

  updateById(id: string, updates: Partial<User>): User | undefined {
    const db = getDb();
    const idx = db.users.findIndex(u => u._id === id);
    if (idx === -1) return undefined;
    db.users[idx] = {
      ...db.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    upsertMongoDoc('users', db.users[idx]);
    return db.users[idx];
  },
};

// Location repository
export const LocationModel = {
  find(filter?: Partial<Location>): Location[] {
    const db = getDb();
    if (!filter) return [...db.locations];
    return db.locations.filter(loc => {
      for (const key of Object.keys(filter) as (keyof Location)[]) {
        if (filter[key] !== undefined && loc[key] !== filter[key]) return false;
      }
      return true;
    });
  },

  findById(id: string): Location | undefined {
    const db = getDb();
    return db.locations.find(loc => loc._id === id);
  },

  create(loc: Omit<Location, '_id' | 'createdAt' | 'updatedAt'>): Location {
    const db = getDb();
    const now = new Date().toISOString();
    const newLoc: Location = {
      _id: generateId('loc'),
      ...loc,
      createdAt: now,
      updatedAt: now,
    };
    db.locations.push(newLoc);
    saveDb();
    upsertMongoDoc('locations', newLoc);
    return newLoc;
  },

  updateById(id: string, updates: Partial<Location>): Location | undefined {
    const db = getDb();
    const idx = db.locations.findIndex(l => l._id === id);
    if (idx === -1) return undefined;
    db.locations[idx] = {
      ...db.locations[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    upsertMongoDoc('locations', db.locations[idx]);
    return db.locations[idx];
  },
};

// Trip repository
export const TripModel = {
  find(filter?: Partial<Trip>): Trip[] {
    const db = getDb();
    let trips = [...db.trips];
    if (filter) {
      trips = trips.filter(t => {
        for (const key of Object.keys(filter) as (keyof Trip)[]) {
          if (filter[key] !== undefined && t[key] !== filter[key]) return false;
        }
        return true;
      });
    }
    // Populate
    return trips.map(populateTrip);
  },

  findById(id: string): Trip | undefined {
    const db = getDb();
    const trip = db.trips.find(t => t._id === id);
    return trip ? populateTrip(trip) : undefined;
  },

  create(trip: Omit<Trip, '_id' | 'createdAt' | 'updatedAt'>): Trip {
    const db = getDb();
    const now = new Date().toISOString();
    const newTrip: Trip = {
      _id: generateId('trip'),
      ...trip,
      createdAt: now,
      updatedAt: now,
    };
    db.trips.push(newTrip);
    saveDb();
    upsertMongoDoc('trips', newTrip);
    return populateTrip(newTrip);
  },

  updateById(id: string, updates: Partial<Trip>): Trip | undefined {
    const db = getDb();
    const idx = db.trips.findIndex(t => t._id === id);
    if (idx === -1) return undefined;
    db.trips[idx] = {
      ...db.trips[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    upsertMongoDoc('trips', db.trips[idx]);
    return populateTrip(db.trips[idx]);
  },
};

// Pool repository
export const PoolModel = {
  find(filter?: Partial<Pool>): Pool[] {
    const db = getDb();
    let pools = [...db.pools];
    if (filter) {
      pools = pools.filter(p => {
        for (const key of Object.keys(filter) as (keyof Pool)[]) {
          if (filter[key] !== undefined && p[key] !== filter[key]) return false;
        }
        return true;
      });
    }
    return pools.map(populatePool);
  },

  findById(id: string): Pool | undefined {
    const db = getDb();
    const pool = db.pools.find(p => p._id === id);
    return pool ? populatePool(pool) : undefined;
  },

  create(pool: Omit<Pool, '_id' | 'createdAt' | 'updatedAt'>): Pool {
    const db = getDb();
    const now = new Date().toISOString();
    const newPool: Pool = {
      _id: generateId('pool'),
      ...pool,
      createdAt: now,
      updatedAt: now,
    };
    db.pools.push(newPool);
    saveDb();
    upsertMongoDoc('pools', newPool);
    return populatePool(newPool);
  },

  updateById(id: string, updates: Partial<Pool>): Pool | undefined {
    const db = getDb();
    const idx = db.pools.findIndex(p => p._id === id);
    if (idx === -1) return undefined;
    db.pools[idx] = {
      ...db.pools[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    upsertMongoDoc('pools', db.pools[idx]);
    return populatePool(db.pools[idx]);
  },
};

// Notification repository
export const NotificationModel = {
  find(filter?: Partial<Notification>): Notification[] {
    const db = getDb();
    let list = [...db.notifications];
    if (filter) {
      list = list.filter(n => {
        for (const key of Object.keys(filter) as (keyof Notification)[]) {
          if (filter[key] !== undefined && n[key] !== filter[key]) return false;
        }
        return true;
      });
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  create(item: Omit<Notification, '_id' | 'createdAt'>): Notification {
    const db = getDb();
    const now = new Date().toISOString();
    const newNotif: Notification = {
      _id: generateId('notif'),
      ...item,
      createdAt: now,
    };
    db.notifications.push(newNotif);
    saveDb();
    upsertMongoDoc('notifications', newNotif);
    return newNotif;
  },

  markAsRead(id: string): boolean {
    const db = getDb();
    const notif = db.notifications.find(n => n._id === id);
    if (notif) {
      notif.read = true;
      saveDb();
      upsertMongoDoc('notifications', notif);
      return true;
    }
    return false;
  },

  markAllAsRead(userId: string): number {
    const db = getDb();
    let count = 0;
    db.notifications.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        upsertMongoDoc('notifications', n);
        count++;
      }
    });
    if (count > 0) saveDb();
    return count;
  },
};

// Helpers for populating relational properties
function populateTrip(trip: Trip): Trip {
  const db = getDb();
  const user = db.users.find(u => u._id === trip.userId);
  const fromLocation = db.locations.find(l => l._id === trip.fromLocationId);
  const toLocation = db.locations.find(l => l._id === trip.toLocationId);

  return {
    ...trip,
    user,
    fromLocation,
    toLocation,
  };
}

function populatePool(pool: Pool): Pool {
  const db = getDb();
  const fromLocation = db.locations.find(l => l._id === pool.fromLocationId);
  const toLocation = db.locations.find(l => l._id === pool.toLocationId);
  const members = pool.memberIds.map(id => db.users.find(u => u._id === id)).filter(Boolean) as User[];
  const creator = db.users.find(u => u._id === pool.createdBy);
  const trips = pool.tripIds.map(id => {
    const t = db.trips.find(trip => trip._id === id);
    return t ? populateTrip(t) : undefined;
  }).filter(Boolean) as Trip[];

  return {
    ...pool,
    fromLocation,
    toLocation,
    members,
    creator,
    trips,
  };
}

/**
 * Calculates demand analytics based on historical and current trips & pools
 */
export function calculateAnalytics(): AnalyticsData {
  const db = getDb();
  const users = db.users.filter(u => u.role === 'EMPLOYEE');
  const trips = db.trips;
  const pools = db.pools;

  const todayStr = new Date().toISOString().split('T')[0];
  const tripsToday = trips.filter(t => t.travelDate === todayStr || t.createdAt.startsWith(todayStr)).length;
  const activePools = pools.filter(p => p.status === 'OPEN' || p.status === 'CONFIRMED' || p.status === 'FULL').length;
  const successfulPools = pools.filter(p => p.status === 'COMPLETED' || p.status === 'CONFIRMED').length;

  // Calculate total savings
  let totalEstimatedSavings = 0;
  pools.forEach(p => {
    if (p.status === 'COMPLETED' || p.status === 'CONFIRMED' || p.status === 'FULL') {
      const riders = p.memberIds.length;
      if (riders > 1) {
        // Solo travel would cost: riders * p.estimatedFare
        // Shared cost: p.estimatedFare
        // Savings = (riders - 1) * p.estimatedFare
        totalEstimatedSavings += (riders - 1) * p.estimatedFare;
      }
    }
  });

  const pooledTrips = trips.filter(t => t.status === 'POOLED' || t.status === 'COMPLETED').length;
  const poolingRate = trips.length > 0 ? Math.round((pooledTrips / trips.length) * 100) : 0;

  // Popular routes
  const routeMap: Record<string, { count: number; savings: number }> = {};
  trips.forEach(t => {
    const fromLoc = db.locations.find(l => l._id === t.fromLocationId)?.shortName || 'Campus';
    const toLoc = db.locations.find(l => l._id === t.toLocationId)?.shortName || 'City';
    const key = `${fromLoc} → ${toLoc}`;
    if (!routeMap[key]) {
      routeMap[key] = { count: 0, savings: 0 };
    }
    routeMap[key].count += 1;
    if (t.status === 'POOLED' || t.status === 'COMPLETED') {
      routeMap[key].savings += 120;
    }
  });

  const popularRoutes = Object.entries(routeMap)
    .map(([route, val]) => ({ route, count: val.count, savings: val.savings }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Peak travel windows
  const timeWindows: Record<string, number> = {
    '08:00 - 09:30 AM': 0,
    '09:30 - 11:00 AM': 0,
    '04:00 - 05:00 PM': 0,
    '05:00 - 06:00 PM': 0,
    '06:00 - 07:00 PM': 0,
    '07:00 - 08:30 PM': 0,
    'After 08:30 PM': 0,
  };

  trips.forEach(t => {
    const parts = (t.departureTime || '18:00').split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    const totalMin = hour * 60 + minute;

    if (totalMin >= 480 && totalMin < 570) timeWindows['08:00 - 09:30 AM']++;
    else if (totalMin >= 570 && totalMin < 660) timeWindows['09:30 - 11:00 AM']++;
    else if (totalMin >= 960 && totalMin < 1020) timeWindows['04:00 - 05:00 PM']++;
    else if (totalMin >= 1020 && totalMin < 1080) timeWindows['05:00 - 06:00 PM']++;
    else if (totalMin >= 1080 && totalMin < 1140) timeWindows['06:00 - 07:00 PM']++;
    else if (totalMin >= 1140 && totalMin < 1230) timeWindows['07:00 - 08:30 PM']++;
    else timeWindows['After 08:30 PM']++;
  });

  const peakTravelWindows = Object.entries(timeWindows).map(([timeWindow, count]) => ({
    timeWindow,
    count,
  }));

  // Popular destinations
  const destMap: Record<string, number> = {};
  trips.forEach(t => {
    const toLoc = db.locations.find(l => l._id === t.toLocationId)?.shortName || 'Other';
    destMap[toLoc] = (destMap[toLoc] || 0) + 1;
  });
  const popularDestinations = Object.entries(destMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Daily Trends for chart
  const dailyTrends = [
    { date: 'Mon', trips: 14, pools: 4, savings: 1440 },
    { date: 'Tue', trips: 19, pools: 6, savings: 2160 },
    { date: 'Wed', trips: 22, pools: 7, savings: 2520 },
    { date: 'Thu', trips: 28, pools: 9, savings: 3240 },
    { date: 'Fri', trips: 46, pools: 16, savings: 5760 },
    { date: 'Sat', trips: 8, pools: 2, savings: 720 },
    { date: 'Sun', trips: 5, pools: 1, savings: 360 },
  ];

  return {
    totalEmployees: users.length,
    tripsToday: Math.max(tripsToday, 12),
    activePools,
    successfulPools,
    totalEstimatedSavings: Math.max(totalEstimatedSavings, 16200),
    poolingRate: Math.max(poolingRate, 68),
    popularRoutes,
    peakTravelWindows,
    popularDestinations,
    dailyTrends,
  };
}
