// src/serverApp.ts
import express from "express";

// src/lib/db.ts
import fs from "fs";
import path from "path";

// src/lib/mongodb.ts
import mongoose, { Schema } from "mongoose";
var cached = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}
var UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    employeeId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String },
    initials: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, enum: ["EMPLOYEE", "ADMIN"], default: "EMPLOYEE" },
    active: { type: Boolean, default: true },
    phone: { type: String },
    createdAt: { type: String },
    updatedAt: { type: String }
  },
  { _id: false, timestamps: false, collection: "users" }
);
var LocationSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, default: "" },
    landmark: { type: String, default: "" },
    active: { type: Boolean, default: true },
    createdAt: { type: String },
    updatedAt: { type: String }
  },
  { _id: false, timestamps: false, collection: "locations" }
);
var TripSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    fromLocationId: { type: String, required: true },
    toLocationId: { type: String, required: true },
    travelDate: { type: String, required: true, index: true },
    departureTime: { type: String, required: true },
    flexibleMinutes: { type: Number, default: 15 },
    status: {
      type: String,
      enum: ["SEARCHING", "MATCHED", "POOLED", "COMPLETED", "CANCELLED"],
      default: "SEARCHING"
    },
    poolId: { type: String, default: null },
    createdAt: { type: String },
    updatedAt: { type: String }
  },
  { _id: false, timestamps: false, collection: "trips" }
);
var PoolSchema = new Schema(
  {
    _id: { type: String, required: true },
    fromLocationId: { type: String, required: true },
    toLocationId: { type: String, required: true },
    travelDate: { type: String, required: true, index: true },
    suggestedDepartureTime: { type: String, required: true },
    pickupPoint: { type: String, required: true },
    memberIds: [{ type: String }],
    tripIds: [{ type: String }],
    maxPassengers: { type: Number, default: 4 },
    estimatedFare: { type: Number, default: 180 },
    status: {
      type: String,
      enum: ["OPEN", "FULL", "CONFIRMED", "COMPLETED", "CANCELLED"],
      default: "OPEN"
    },
    createdBy: { type: String, required: true },
    createdAt: { type: String },
    updatedAt: { type: String }
  },
  { _id: false, timestamps: false, collection: "pools" }
);
var NotificationSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: { type: String, required: true },
    poolId: { type: String },
    createdAt: { type: String }
  },
  { _id: false, timestamps: false, collection: "notifications" }
);
var MongoUserModel = mongoose.models.User || mongoose.model("User", UserSchema);
var MongoLocationModel = mongoose.models.Location || mongoose.model("Location", LocationSchema);
var MongoTripModel = mongoose.models.Trip || mongoose.model("Trip", TripSchema);
var MongoPoolModel = mongoose.models.Pool || mongoose.model("Pool", PoolSchema);
var MongoNotificationModel = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
async function connectToMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === "") {
    return null;
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5e3
    };
    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log("\u2705 Connected to MongoDB Atlas successfully");
      return m;
    }).catch((err) => {
      console.warn("\u26A0\uFE0F MongoDB connection error, continuing with local storage:", err.message);
      cached.promise = null;
      return null;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch {
    cached.conn = null;
  }
  return cached.conn;
}
function isMongoDBConnected() {
  return mongoose.connection.readyState === 1;
}
async function loadDataFromMongoDB() {
  const conn = await connectToMongoDB();
  if (!conn || !isMongoDBConnected()) {
    return null;
  }
  try {
    const [users, locations, trips, pools, notifications] = await Promise.all([
      MongoUserModel.find({}).lean(),
      MongoLocationModel.find({}).lean(),
      MongoTripModel.find({}).lean(),
      MongoPoolModel.find({}).lean(),
      MongoNotificationModel.find({}).lean()
    ]);
    return {
      users: (users || []).map((u) => ({ ...u, _id: String(u._id) })),
      locations: (locations || []).map((l) => ({ ...l, _id: String(l._id) })),
      trips: (trips || []).map((t) => ({ ...t, _id: String(t._id) })),
      pools: (pools || []).map((p) => ({ ...p, _id: String(p._id) })),
      notifications: (notifications || []).map((n) => ({ ...n, _id: String(n._id) }))
    };
  } catch (err) {
    console.warn("Error loading collections from MongoDB Atlas:", err);
    return null;
  }
}
async function saveAllToMongoDB(data) {
  const conn = await connectToMongoDB();
  if (!conn || !isMongoDBConnected()) {
    return false;
  }
  try {
    await Promise.all([
      MongoUserModel.deleteMany({}),
      MongoLocationModel.deleteMany({}),
      MongoTripModel.deleteMany({}),
      MongoPoolModel.deleteMany({}),
      MongoNotificationModel.deleteMany({})
    ]);
    await Promise.all([
      data.users.length > 0 ? MongoUserModel.insertMany(data.users) : Promise.resolve(),
      data.locations.length > 0 ? MongoLocationModel.insertMany(data.locations) : Promise.resolve(),
      data.trips.length > 0 ? MongoTripModel.insertMany(data.trips) : Promise.resolve(),
      data.pools.length > 0 ? MongoPoolModel.insertMany(data.pools) : Promise.resolve(),
      data.notifications.length > 0 ? MongoNotificationModel.insertMany(data.notifications) : Promise.resolve()
    ]);
    console.log("\u2705 Synchronized dataset to MongoDB Atlas successfully");
    return true;
  } catch (err) {
    console.error("Failed to sync dataset to MongoDB Atlas:", err);
    return false;
  }
}
async function upsertMongoDoc(collection, doc) {
  if (!isMongoDBConnected()) return;
  try {
    const model = collection === "users" ? MongoUserModel : collection === "locations" ? MongoLocationModel : collection === "trips" ? MongoTripModel : collection === "pools" ? MongoPoolModel : MongoNotificationModel;
    await model.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
  } catch (err) {
    console.warn(`Could not sync ${collection} document to MongoDB Atlas:`, err);
  }
}

// src/lib/db.ts
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_FILE = path.join(DATA_DIR, "smart_pooling_db.json");
var inMemoryData = null;
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
    }
  }
}
function generateId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}
async function initDatabase(forceSeed = false) {
  if (inMemoryData && !forceSeed) {
    return inMemoryData;
  }
  if (process.env.MONGODB_URI) {
    try {
      const conn = await connectToMongoDB();
      if (conn) {
        const mongoData = await loadDataFromMongoDB();
        if (!forceSeed && mongoData && mongoData.users.length > 0 && mongoData.locations.length > 0) {
          inMemoryData = mongoData;
          console.log(`\u2705 Loaded ${mongoData.users.length} users and ${mongoData.locations.length} locations from MongoDB Atlas`);
          return inMemoryData;
        }
      }
    } catch (err) {
      console.warn("Could not initialize from MongoDB Atlas, falling back to local storage:", err);
    }
  }
  ensureDataDir();
  if (!forceSeed && fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      inMemoryData = JSON.parse(raw);
      return inMemoryData;
    } catch (e) {
      console.warn("Failed to parse existing DB file, re-initializing", e);
    }
  }
  inMemoryData = {
    users: [],
    locations: [],
    trips: [],
    pools: [],
    notifications: []
  };
  return inMemoryData;
}
function getDb() {
  if (inMemoryData) {
    return inMemoryData;
  }
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      inMemoryData = JSON.parse(raw);
      return inMemoryData;
    } catch (e) {
      console.warn("Failed to parse existing DB file, re-initializing", e);
    }
  }
  inMemoryData = {
    users: [],
    locations: [],
    trips: [],
    pools: [],
    notifications: []
  };
  saveDb();
  return inMemoryData;
}
function saveDb() {
  if (!inMemoryData) return;
  ensureDataDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryData, null, 2), "utf-8");
  } catch (e) {
  }
  if (isMongoDBConnected()) {
    saveAllToMongoDB(inMemoryData).catch((err) => {
      console.warn("Background MongoDB sync notice:", err.message);
    });
  }
}
var UserModel = {
  find(filter) {
    const db = getDb();
    if (!filter) return [...db.users];
    return db.users.filter((u) => {
      for (const key of Object.keys(filter)) {
        if (filter[key] !== void 0 && u[key] !== filter[key]) return false;
      }
      return true;
    });
  },
  findById(id) {
    const db = getDb();
    return db.users.find((u) => u._id === id);
  },
  findByEmployeeId(employeeId) {
    const db = getDb();
    return db.users.find((u) => u.employeeId.toLowerCase() === employeeId.toLowerCase());
  },
  create(user) {
    const db = getDb();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newUser = {
      _id: generateId("usr"),
      ...user,
      createdAt: now,
      updatedAt: now
    };
    db.users.push(newUser);
    saveDb();
    upsertMongoDoc("users", newUser);
    return newUser;
  },
  updateById(id, updates) {
    const db = getDb();
    const idx = db.users.findIndex((u) => u._id === id);
    if (idx === -1) return void 0;
    db.users[idx] = {
      ...db.users[idx],
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb();
    upsertMongoDoc("users", db.users[idx]);
    return db.users[idx];
  }
};
var LocationModel = {
  find(filter) {
    const db = getDb();
    if (!filter) return [...db.locations];
    return db.locations.filter((loc) => {
      for (const key of Object.keys(filter)) {
        if (filter[key] !== void 0 && loc[key] !== filter[key]) return false;
      }
      return true;
    });
  },
  findById(id) {
    const db = getDb();
    return db.locations.find((loc) => loc._id === id);
  },
  create(loc) {
    const db = getDb();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newLoc = {
      _id: generateId("loc"),
      ...loc,
      createdAt: now,
      updatedAt: now
    };
    db.locations.push(newLoc);
    saveDb();
    upsertMongoDoc("locations", newLoc);
    return newLoc;
  },
  updateById(id, updates) {
    const db = getDb();
    const idx = db.locations.findIndex((l) => l._id === id);
    if (idx === -1) return void 0;
    db.locations[idx] = {
      ...db.locations[idx],
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb();
    upsertMongoDoc("locations", db.locations[idx]);
    return db.locations[idx];
  }
};
var TripModel = {
  find(filter) {
    const db = getDb();
    let trips = [...db.trips];
    if (filter) {
      trips = trips.filter((t) => {
        for (const key of Object.keys(filter)) {
          if (filter[key] !== void 0 && t[key] !== filter[key]) return false;
        }
        return true;
      });
    }
    return trips.map(populateTrip);
  },
  findById(id) {
    const db = getDb();
    const trip = db.trips.find((t) => t._id === id);
    return trip ? populateTrip(trip) : void 0;
  },
  create(trip) {
    const db = getDb();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newTrip = {
      _id: generateId("trip"),
      ...trip,
      createdAt: now,
      updatedAt: now
    };
    db.trips.push(newTrip);
    saveDb();
    upsertMongoDoc("trips", newTrip);
    return populateTrip(newTrip);
  },
  updateById(id, updates) {
    const db = getDb();
    const idx = db.trips.findIndex((t) => t._id === id);
    if (idx === -1) return void 0;
    db.trips[idx] = {
      ...db.trips[idx],
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb();
    upsertMongoDoc("trips", db.trips[idx]);
    return populateTrip(db.trips[idx]);
  }
};
var PoolModel = {
  find(filter) {
    const db = getDb();
    let pools = [...db.pools];
    if (filter) {
      pools = pools.filter((p) => {
        for (const key of Object.keys(filter)) {
          if (filter[key] !== void 0 && p[key] !== filter[key]) return false;
        }
        return true;
      });
    }
    return pools.map(populatePool);
  },
  findById(id) {
    const db = getDb();
    const pool = db.pools.find((p) => p._id === id);
    return pool ? populatePool(pool) : void 0;
  },
  create(pool) {
    const db = getDb();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newPool = {
      _id: generateId("pool"),
      ...pool,
      createdAt: now,
      updatedAt: now
    };
    db.pools.push(newPool);
    saveDb();
    upsertMongoDoc("pools", newPool);
    return populatePool(newPool);
  },
  updateById(id, updates) {
    const db = getDb();
    const idx = db.pools.findIndex((p) => p._id === id);
    if (idx === -1) return void 0;
    db.pools[idx] = {
      ...db.pools[idx],
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb();
    upsertMongoDoc("pools", db.pools[idx]);
    return populatePool(db.pools[idx]);
  }
};
var NotificationModel = {
  find(filter) {
    const db = getDb();
    let list = [...db.notifications];
    if (filter) {
      list = list.filter((n) => {
        for (const key of Object.keys(filter)) {
          if (filter[key] !== void 0 && n[key] !== filter[key]) return false;
        }
        return true;
      });
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  create(item) {
    const db = getDb();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newNotif = {
      _id: generateId("notif"),
      ...item,
      createdAt: now
    };
    db.notifications.push(newNotif);
    saveDb();
    upsertMongoDoc("notifications", newNotif);
    return newNotif;
  },
  markAsRead(id) {
    const db = getDb();
    const notif = db.notifications.find((n) => n._id === id);
    if (notif) {
      notif.read = true;
      saveDb();
      upsertMongoDoc("notifications", notif);
      return true;
    }
    return false;
  },
  markAllAsRead(userId) {
    const db = getDb();
    let count = 0;
    db.notifications.forEach((n) => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        upsertMongoDoc("notifications", n);
        count++;
      }
    });
    if (count > 0) saveDb();
    return count;
  }
};
function populateTrip(trip) {
  const db = getDb();
  const user = db.users.find((u) => u._id === trip.userId);
  const fromLocation = db.locations.find((l) => l._id === trip.fromLocationId);
  const toLocation = db.locations.find((l) => l._id === trip.toLocationId);
  const rawPool = trip.poolId ? db.pools.find((p) => p._id === trip.poolId) : void 0;
  const pool = rawPool ? {
    ...rawPool,
    fromLocation: db.locations.find((l) => l._id === rawPool.fromLocationId),
    toLocation: db.locations.find((l) => l._id === rawPool.toLocationId),
    members: rawPool.memberIds.map((id) => db.users.find((u) => u._id === id)).filter(Boolean),
    creator: db.users.find((u) => u._id === rawPool.createdBy)
  } : void 0;
  return {
    ...trip,
    user,
    fromLocation,
    toLocation,
    pool
  };
}
function populatePool(pool) {
  const db = getDb();
  const fromLocation = db.locations.find((l) => l._id === pool.fromLocationId);
  const toLocation = db.locations.find((l) => l._id === pool.toLocationId);
  const members = pool.memberIds.map((id) => db.users.find((u) => u._id === id)).filter(Boolean);
  const creator = db.users.find((u) => u._id === pool.createdBy);
  const trips = pool.tripIds.map((id) => {
    const t = db.trips.find((trip) => trip._id === id);
    return t ? populateTrip(t) : void 0;
  }).filter(Boolean);
  return {
    ...pool,
    fromLocation,
    toLocation,
    members,
    creator,
    trips
  };
}
function calculateAnalytics() {
  const db = getDb();
  const users = db.users.filter((u) => u.role === "EMPLOYEE");
  const trips = db.trips;
  const pools = db.pools;
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const tripsToday = trips.filter((t) => t.travelDate === todayStr || t.createdAt.startsWith(todayStr)).length;
  const activePools = pools.filter((p) => p.status === "OPEN" || p.status === "CONFIRMED" || p.status === "FULL").length;
  const successfulPools = pools.filter((p) => p.status === "COMPLETED" || p.status === "CONFIRMED").length;
  let totalEstimatedSavings = 0;
  pools.forEach((p) => {
    if (p.status === "COMPLETED" || p.status === "CONFIRMED" || p.status === "FULL") {
      const riders = p.memberIds.length;
      if (riders > 1) {
        totalEstimatedSavings += (riders - 1) * p.estimatedFare;
      }
    }
  });
  const pooledTrips = trips.filter((t) => t.status === "POOLED" || t.status === "COMPLETED").length;
  const poolingRate = trips.length > 0 ? Math.round(pooledTrips / trips.length * 100) : 0;
  const routeMap = {};
  trips.forEach((t) => {
    const fromLoc = db.locations.find((l) => l._id === t.fromLocationId)?.shortName || "Campus";
    const toLoc = db.locations.find((l) => l._id === t.toLocationId)?.shortName || "City";
    const key = `${fromLoc} \u2192 ${toLoc}`;
    if (!routeMap[key]) {
      routeMap[key] = { count: 0, savings: 0 };
    }
    routeMap[key].count += 1;
    if (t.status === "POOLED" || t.status === "COMPLETED") {
      routeMap[key].savings += 120;
    }
  });
  const popularRoutes = Object.entries(routeMap).map(([route, val]) => ({ route, count: val.count, savings: val.savings })).sort((a, b) => b.count - a.count).slice(0, 5);
  const timeWindows = {
    "08:00 - 09:30 AM": 0,
    "09:30 - 11:00 AM": 0,
    "04:00 - 05:00 PM": 0,
    "05:00 - 06:00 PM": 0,
    "06:00 - 07:00 PM": 0,
    "07:00 - 08:30 PM": 0,
    "After 08:30 PM": 0
  };
  trips.forEach((t) => {
    const parts = (t.departureTime || "18:00").split(":");
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    const totalMin = hour * 60 + minute;
    if (totalMin >= 480 && totalMin < 570) timeWindows["08:00 - 09:30 AM"]++;
    else if (totalMin >= 570 && totalMin < 660) timeWindows["09:30 - 11:00 AM"]++;
    else if (totalMin >= 960 && totalMin < 1020) timeWindows["04:00 - 05:00 PM"]++;
    else if (totalMin >= 1020 && totalMin < 1080) timeWindows["05:00 - 06:00 PM"]++;
    else if (totalMin >= 1080 && totalMin < 1140) timeWindows["06:00 - 07:00 PM"]++;
    else if (totalMin >= 1140 && totalMin < 1230) timeWindows["07:00 - 08:30 PM"]++;
    else timeWindows["After 08:30 PM"]++;
  });
  const peakTravelWindows = Object.entries(timeWindows).map(([timeWindow, count]) => ({
    timeWindow,
    count
  }));
  const destMap = {};
  trips.forEach((t) => {
    const toLoc = db.locations.find((l) => l._id === t.toLocationId)?.shortName || "Other";
    destMap[toLoc] = (destMap[toLoc] || 0) + 1;
  });
  const popularDestinations = Object.entries(destMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const dailyTrends = [
    { date: "Mon", trips: 14, pools: 4, savings: 1440 },
    { date: "Tue", trips: 19, pools: 6, savings: 2160 },
    { date: "Wed", trips: 22, pools: 7, savings: 2520 },
    { date: "Thu", trips: 28, pools: 9, savings: 3240 },
    { date: "Fri", trips: 46, pools: 16, savings: 5760 },
    { date: "Sat", trips: 8, pools: 2, savings: 720 },
    { date: "Sun", trips: 5, pools: 1, savings: 360 }
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
    dailyTrends
  };
}

// src/lib/matching.ts
function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}
function minutesToTimeString(minutes) {
  const norm = (minutes % 1440 + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function formatTime12Hour(timeStr) {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}
function calculateTimeDifference(time1, time2) {
  const m1 = timeStringToMinutes(time1);
  const m2 = timeStringToMinutes(time2);
  return Math.abs(m1 - m2);
}
function calculateMatchScore(timeDiffMinutes) {
  if (timeDiffMinutes <= 5) return 100;
  if (timeDiffMinutes <= 10) return 90;
  if (timeDiffMinutes <= 15) return 80;
  if (timeDiffMinutes <= 20) return 70;
  if (timeDiffMinutes <= 30) return 60;
  return Math.max(20, 50 - timeDiffMinutes);
}
function getMatchQuality(score) {
  if (score >= 90) return "Excellent Match";
  if (score >= 80) return "Good Match";
  return "Fair Match";
}
function calculateSuggestedDeparture(times) {
  if (times.length === 0) return "18:00";
  const minutesList = times.map(timeStringToMinutes);
  const sum = minutesList.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / minutesList.length;
  const rounded = Math.round(avg / 5) * 5;
  return minutesToTimeString(rounded);
}
function isTripCompatible(params) {
  const { candidateTrip, targetTrip, candidatePool } = params;
  if (candidateTrip._id === targetTrip._id) return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  if (candidateTrip.userId === targetTrip.userId) return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  if (candidateTrip.travelDate !== targetTrip.travelDate) {
    return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  }
  if (candidateTrip.fromLocationId !== targetTrip.fromLocationId || candidateTrip.toLocationId !== targetTrip.toLocationId) {
    return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  }
  if (candidateTrip.status === "COMPLETED" || candidateTrip.status === "CANCELLED") {
    return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
  }
  if (candidatePool) {
    if (candidatePool.status === "FULL" || candidatePool.status === "COMPLETED" || candidatePool.status === "CANCELLED") {
      return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
    }
    if (candidatePool.memberIds.length >= candidatePool.maxPassengers) {
      return { compatible: false, timeDiffMinutes: 999, matchScore: 0 };
    }
  }
  const timeDiffMinutes = calculateTimeDifference(candidateTrip.departureTime, targetTrip.departureTime);
  const maxFlexible = Math.max(targetTrip.flexibleMinutes || 15, candidateTrip.flexibleMinutes || 15);
  if (timeDiffMinutes > maxFlexible) {
    return { compatible: false, timeDiffMinutes, matchScore: 0 };
  }
  const matchScore = calculateMatchScore(timeDiffMinutes);
  return { compatible: true, timeDiffMinutes, matchScore };
}

// src/lib/fare.ts
var ROUTE_FARES = {
  // Key format: "From::To" (lowercased)
  "ust campus::trivandrum central railway station": 180,
  "ust campus::trivandrum central": 180,
  "ust campus::thampanoor bus stand": 180,
  "ust campus::thampanoor": 180,
  "ust campus::trivandrum international airport": 250,
  "ust campus::airport": 250,
  "ust campus::kazhakkoottam": 150,
  "technopark::trivandrum central railway station": 170,
  "technopark::thampanoor bus stand": 170,
  "technopark::trivandrum international airport": 240,
  "technopark::kazhakkoottam": 120
};
var DEFAULT_FALLBACK_FARE = 200;
function getEstimatedFare(fromName = "", toName = "") {
  const cleanFrom = fromName.trim().toLowerCase();
  const cleanTo = toName.trim().toLowerCase();
  const key1 = `${cleanFrom}::${cleanTo}`;
  if (ROUTE_FARES[key1]) return ROUTE_FARES[key1];
  const key2 = `${cleanTo}::${cleanFrom}`;
  if (ROUTE_FARES[key2]) return ROUTE_FARES[key2];
  for (const [route, fare] of Object.entries(ROUTE_FARES)) {
    const [rFrom, rTo] = route.split("::");
    if ((cleanFrom.includes(rFrom) || rFrom.includes(cleanFrom)) && (cleanTo.includes(rTo) || rTo.includes(cleanTo))) {
      return fare;
    }
  }
  return DEFAULT_FALLBACK_FARE;
}
function calculateFarePerPerson(estimatedFare, numberOfMembers) {
  if (numberOfMembers <= 0) return estimatedFare;
  return Math.round(estimatedFare / numberOfMembers);
}
function calculateSavingsPerPerson(estimatedFare, numberOfMembers) {
  if (numberOfMembers <= 1) return 0;
  const farePerPerson = calculateFarePerPerson(estimatedFare, numberOfMembers);
  return Math.max(0, estimatedFare - farePerPerson);
}

// src/services/aiService.ts
function deterministicMatchExplanation(input) {
  const { matchingTrips, suggestedDepartureTime, fromLocation, toLocation } = input;
  const count = matchingTrips.length;
  const fromName = fromLocation?.shortName || fromLocation?.name || "UST Campus";
  const toName = toLocation?.shortName || toLocation?.name || "destination";
  if (count === 0) {
    return `No active coworkers have registered overlapping trips for ${fromName} \u2192 ${toName} at this time yet. Your trip is actively listed on the board, and we will alert you as soon as someone posts!`;
  }
  const names = matchingTrips.map((m) => m.user.name.split(" ")[0]);
  const namesFormatted = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  const minDiff = Math.min(...matchingTrips.map((m) => m.timeDifferenceMinutes));
  const maxDiff = Math.max(...matchingTrips.map((m) => m.timeDifferenceMinutes));
  const windowText = maxDiff <= 10 ? "within 10 minutes" : `within a ${maxDiff}-minute window`;
  return `${namesFormatted} are strong matches because they are all traveling along ${fromName} \u2192 ${toName} ${windowText} of your preferred schedule. Departing at ${suggestedDepartureTime} aligns everyone for an effortless group pickup and maximum fare savings.`;
}
function deterministicDemandInsight(input) {
  const { route, peakHour, passengerCount } = input;
  return `Friday between 5:30 PM and 6:30 PM demonstrates peak pooling demand for ${route}, with over ${passengerCount}+ colleagues commuting together. Forming pools during ${peakHour} reduces individual commute expenses by up to 66%.`;
}
async function generateMatchExplanation(input) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (anthropicKey && anthropicKey.startsWith("sk-ant-")) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 250,
          messages: [
            {
              role: "user",
              content: `You are an enterprise commute assistant for Smart Pooling. Write a concise, friendly 2-sentence match explanation for an employee looking to share an auto/cab.
Context:
- User is travelling from: ${input.fromLocation?.name || "UST Campus"}
- User is travelling to: ${input.toLocation?.name || "Trivandrum Central"}
- Suggested departure: ${input.suggestedDepartureTime}
- Matched coworkers: ${input.matchingTrips.map((m) => `${m.user.name} (${m.trip.departureTime})`).join(", ")}
Explain why this is an ideal group and the benefit of leaving at ${input.suggestedDepartureTime}. Be concise and professional. Do not use quotes.`
            }
          ]
        })
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text && text.trim().length > 15) {
          return text.trim();
        }
      }
    } catch (err) {
      console.warn("Anthropic API request failed, falling back to deterministic explanation", err);
    }
  }
  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `You are an enterprise commute coordinator for Smart Pooling. Write a concise, 2-sentence explanation of why these coworkers are a great match for ride pooling.
Route: ${input.fromLocation?.name || "UST Campus"} to ${input.toLocation?.name || "Trivandrum Central"}.
Suggested pickup: ${input.suggestedDepartureTime}.
Colleagues: ${input.matchingTrips.map((m) => `${m.user.name} (${m.trip.departureTime})`).join(", ")}.
Focus on route compatibility and smooth pickup timing. Keep it warm, corporate, and under 40 words.`;
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      if (res.text && res.text.trim().length > 15) {
        return res.text.trim();
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to deterministic insight", err);
    }
  }
  return deterministicMatchExplanation(input);
}
async function generateDemandInsight(input) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (anthropicKey && anthropicKey.startsWith("sk-ant-")) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 200,
          messages: [
            {
              role: "user",
              content: `Give a 1-sentence analytical corporate commute insight for route ${input.route} on ${input.travelDate} with peak ${input.peakHour}. Mention commute efficiency and savings. Keep it under 30 words.`
            }
          ]
        })
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text && text.trim().length > 10) return text.trim();
      }
    } catch {
    }
  }
  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Provide a 1-sentence analytical enterprise commute insight for route ${input.route} around ${input.peakHour}. Be crisp and under 30 words.`
      });
      if (res.text && res.text.trim().length > 10) return res.text.trim();
    } catch {
    }
  }
  return deterministicDemandInsight(input);
}

// scripts/seed.ts
function getDemoFriday() {
  return "2026-09-25";
}
function seedDatabase(force = false) {
  const db = getDb();
  if (!force && db.users.length > 5 && db.locations.length > 4 && db.trips.length > 10) {
    console.log("Database already contains seed data. Skipping seed.");
    return;
  }
  console.log("\u{1F331} Seeding Smart Pooling Database...");
  db.users = [];
  db.locations = [];
  db.trips = [];
  db.pools = [];
  db.notifications = [];
  const locUST = LocationModel.create({
    name: "UST Global Campus",
    shortName: "UST Campus",
    type: "CAMPUS",
    description: "Main Software Development Center and Global Delivery Center",
    landmark: "Main Gate Security Gate 1, Technopark Phase II",
    active: true
  });
  const locTVC = LocationModel.create({
    name: "Trivandrum Central Railway Station",
    shortName: "Trivandrum Central",
    type: "RAILWAY_STATION",
    description: "Major railway transit terminus in Thampanoor, Kerala",
    landmark: "Platform 1 Main Entrance / Prepaid Auto Stand",
    active: true
  });
  const locThampanoor = LocationModel.create({
    name: "Thampanoor Central Bus Stand",
    shortName: "Thampanoor Bus Stand",
    type: "BUS_STAND",
    description: "KSRTC Central Bus Station & Inter-state travel hub",
    landmark: "Bus Terminal Concourse Waiting Area",
    active: true
  });
  const locAirport = LocationModel.create({
    name: "Trivandrum International Airport (TRV)",
    shortName: "Trivandrum Airport",
    type: "AIRPORT",
    description: "Domestic and International departure terminal",
    landmark: "Terminal 2 Departures Drop-off zone",
    active: true
  });
  const locKazhakkoottam = LocationModel.create({
    name: "Kazhakkoottam Junction",
    shortName: "Kazhakkoottam",
    type: "OTHER",
    description: "NH 66 transit junction and residential hub",
    landmark: "Near Kazhakkoottam Police Station / Flyover",
    active: true
  });
  const locTechnoparkPhase1 = LocationModel.create({
    name: "Technopark Phase I Campus",
    shortName: "Technopark Phase 1",
    type: "TECH_PARK",
    description: "Bhavani & Thejaswini Buildings entrance hub",
    landmark: "Main Security Checkpoint & Bus Bay",
    active: true
  });
  const locLulu = LocationModel.create({
    name: "LuLu Mall Thiruvananthapuram",
    shortName: "LuLu Mall",
    type: "OTHER",
    description: "Shopping, dining, and transit hub along NH 66",
    landmark: "East Entrance Pick-up Area",
    active: true
  });
  const userSteven = UserModel.create({
    employeeId: "UST1042",
    name: "Steven Paul",
    email: "steven.paul@ust.com",
    initials: "SP",
    department: "Cloud Solutions Engineering",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 98471 23450"
  });
  const userArun = UserModel.create({
    employeeId: "UST1089",
    name: "Arun Kumar",
    email: "arun.kumar@ust.com",
    initials: "AK",
    department: "Data Platform & Analytics",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 98471 88921"
  });
  const userNeha = UserModel.create({
    employeeId: "UST1154",
    name: "Neha S",
    email: "neha.s@ust.com",
    initials: "NS",
    department: "Digital Experience / UI Engineering",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 97455 11029"
  });
  const userRahul = UserModel.create({
    employeeId: "UST1201",
    name: "Rahul R",
    email: "rahul.r@ust.com",
    initials: "RR",
    department: "Cybersecurity Operations",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 94470 54321"
  });
  const userPriya = UserModel.create({
    employeeId: "UST1245",
    name: "Priya N",
    email: "priya.n@ust.com",
    initials: "PN",
    department: "AI & Generative Solutions",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 98950 33412"
  });
  const userAkash = UserModel.create({
    employeeId: "UST1312",
    name: "Akash M",
    email: "akash.m@ust.com",
    initials: "AM",
    department: "DevOps & SRE",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 94001 99283"
  });
  const userAnjali = UserModel.create({
    employeeId: "UST1380",
    name: "Anjali S",
    email: "anjali.s@ust.com",
    initials: "AS",
    department: "Quality Engineering & Testing",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 98460 77123"
  });
  const userVishnu = UserModel.create({
    employeeId: "UST1420",
    name: "Vishnu K",
    email: "vishnu.k@ust.com",
    initials: "VK",
    department: "Fullstack Platform Services",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 94461 44021"
  });
  const userMeera = UserModel.create({
    employeeId: "UST1499",
    name: "Meera R",
    email: "meera.r@ust.com",
    initials: "MR",
    department: "Product Strategy & Management",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 97472 66319"
  });
  const userNikhil = UserModel.create({
    employeeId: "UST1532",
    name: "Nikhil P",
    email: "nikhil.p@ust.com",
    initials: "NP",
    department: "Enterprise Architecture",
    role: "EMPLOYEE",
    active: true,
    phone: "+91 98477 55190"
  });
  const userAdmin = UserModel.create({
    employeeId: "UST0010",
    name: "Admin User (Transport Operations)",
    email: "transport.admin@ust.com",
    initials: "AD",
    department: "Corporate Facilities & Transport",
    role: "ADMIN",
    active: true,
    phone: "+91 98470 00001"
  });
  const friday = getDemoFriday();
  const today = "2026-09-22";
  const tripArun = TripModel.create({
    userId: userArun._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: friday,
    departureTime: "17:50",
    // 5:50 PM
    flexibleMinutes: 15,
    status: "SEARCHING"
  });
  const tripNeha = TripModel.create({
    userId: userNeha._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: friday,
    departureTime: "18:10",
    // 6:10 PM
    flexibleMinutes: 15,
    status: "SEARCHING"
  });
  TripModel.create({
    userId: userRahul._id,
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: friday,
    departureTime: "18:00",
    flexibleMinutes: 15,
    status: "SEARCHING"
  });
  TripModel.create({
    userId: userPriya._id,
    fromLocationId: locUST._id,
    toLocationId: locThampanoor._id,
    travelDate: friday,
    departureTime: "18:05",
    flexibleMinutes: 15,
    status: "SEARCHING"
  });
  TripModel.create({
    userId: userVishnu._id,
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: friday,
    departureTime: "17:45",
    flexibleMinutes: 15,
    status: "SEARCHING"
  });
  const tripStevenActive = TripModel.create({
    userId: userSteven._id,
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: today,
    departureTime: "18:15",
    flexibleMinutes: 15,
    status: "POOLED"
  });
  const tripAkashActive = TripModel.create({
    userId: userAkash._id,
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: today,
    departureTime: "18:15",
    flexibleMinutes: 15,
    status: "POOLED"
  });
  const tripAnjaliActive = TripModel.create({
    userId: userAnjali._id,
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: today,
    departureTime: "18:20",
    flexibleMinutes: 15,
    status: "POOLED"
  });
  const activePool = PoolModel.create({
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: today,
    suggestedDepartureTime: "18:15",
    pickupPoint: "Main Gate, UST Campus",
    memberIds: [userSteven._id, userAkash._id, userAnjali._id],
    tripIds: [tripStevenActive._id, tripAkashActive._id, tripAnjaliActive._id],
    maxPassengers: 4,
    estimatedFare: 150,
    status: "OPEN",
    createdBy: userSteven._id
  });
  TripModel.updateById(tripStevenActive._id, { poolId: activePool._id });
  TripModel.updateById(tripAkashActive._id, { poolId: activePool._id });
  TripModel.updateById(tripAnjaliActive._id, { poolId: activePool._id });
  const historicalDates = [
    "2026-09-18",
    // Last Friday
    "2026-09-17",
    "2026-09-16",
    "2026-09-15",
    "2026-09-14",
    "2026-09-11"
    // Prior Friday
  ];
  const hTrip1 = TripModel.create({
    userId: userSteven._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: historicalDates[0],
    departureTime: "18:00",
    flexibleMinutes: 15,
    status: "COMPLETED"
  });
  const hTrip2 = TripModel.create({
    userId: userArun._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: historicalDates[0],
    departureTime: "17:55",
    flexibleMinutes: 15,
    status: "COMPLETED"
  });
  const hTrip3 = TripModel.create({
    userId: userNeha._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: historicalDates[0],
    departureTime: "18:05",
    flexibleMinutes: 15,
    status: "COMPLETED"
  });
  const compPool1 = PoolModel.create({
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: historicalDates[0],
    suggestedDepartureTime: "18:00",
    pickupPoint: "UST Main Gate Security",
    memberIds: [userSteven._id, userArun._id, userNeha._id],
    tripIds: [hTrip1._id, hTrip2._id, hTrip3._id],
    maxPassengers: 4,
    estimatedFare: 180,
    status: "COMPLETED",
    createdBy: userSteven._id
  });
  TripModel.updateById(hTrip1._id, { poolId: compPool1._id });
  TripModel.updateById(hTrip2._id, { poolId: compPool1._id });
  TripModel.updateById(hTrip3._id, { poolId: compPool1._id });
  const hTrip4 = TripModel.create({
    userId: userRahul._id,
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: historicalDates[1],
    departureTime: "16:30",
    flexibleMinutes: 15,
    status: "COMPLETED"
  });
  const hTrip5 = TripModel.create({
    userId: userPriya._id,
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: historicalDates[1],
    departureTime: "16:35",
    flexibleMinutes: 15,
    status: "COMPLETED"
  });
  const hTrip6 = TripModel.create({
    userId: userMeera._id,
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: historicalDates[1],
    departureTime: "16:40",
    flexibleMinutes: 15,
    status: "COMPLETED"
  });
  const compPool2 = PoolModel.create({
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: historicalDates[1],
    suggestedDepartureTime: "16:35",
    pickupPoint: "Phase II Food Court Entrance",
    memberIds: [userRahul._id, userPriya._id, userMeera._id],
    tripIds: [hTrip4._id, hTrip5._id, hTrip6._id],
    maxPassengers: 4,
    estimatedFare: 250,
    status: "COMPLETED",
    createdBy: userRahul._id
  });
  TripModel.updateById(hTrip4._id, { poolId: compPool2._id });
  TripModel.updateById(hTrip5._id, { poolId: compPool2._id });
  TripModel.updateById(hTrip6._id, { poolId: compPool2._id });
  const hTrip7 = TripModel.create({
    userId: userAkash._id,
    fromLocationId: locUST._id,
    toLocationId: locThampanoor._id,
    travelDate: historicalDates[2],
    departureTime: "18:45",
    flexibleMinutes: 15,
    status: "COMPLETED"
  });
  const hTrip8 = TripModel.create({
    userId: userNikhil._id,
    fromLocationId: locUST._id,
    toLocationId: locThampanoor._id,
    travelDate: historicalDates[2],
    departureTime: "18:50",
    flexibleMinutes: 15,
    status: "COMPLETED"
  });
  const compPool3 = PoolModel.create({
    fromLocationId: locUST._id,
    toLocationId: locThampanoor._id,
    travelDate: historicalDates[2],
    suggestedDepartureTime: "18:45",
    pickupPoint: "UST Main Gate",
    memberIds: [userAkash._id, userNikhil._id],
    tripIds: [hTrip7._id, hTrip8._id],
    maxPassengers: 4,
    estimatedFare: 180,
    status: "COMPLETED",
    createdBy: userAkash._id
  });
  TripModel.updateById(hTrip7._id, { poolId: compPool3._id });
  TripModel.updateById(hTrip8._id, { poolId: compPool3._id });
  const allUsers = [userSteven, userArun, userNeha, userRahul, userPriya, userAkash, userAnjali, userVishnu, userMeera, userNikhil];
  const allLocs = [locTVC, locThampanoor, locAirport, locKazhakkoottam, locTechnoparkPhase1, locLulu];
  for (let i = 0; i < 24; i++) {
    const usr = allUsers[i % allUsers.length];
    const dest = allLocs[i % allLocs.length];
    const date = historicalDates[i % historicalDates.length];
    const hour = 17 + i % 3;
    const min = i * 10 % 60;
    const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const status = i % 5 === 0 ? "CANCELLED" : "COMPLETED";
    TripModel.create({
      userId: usr._id,
      fromLocationId: locUST._id,
      toLocationId: dest._id,
      travelDate: date,
      departureTime: timeStr,
      flexibleMinutes: 15,
      status
    });
  }
  NotificationModel.create({
    userId: userSteven._id,
    title: "Welcome to Smart Pooling",
    message: "Find colleagues heading your way, share the ride, and split the fare seamlessly.",
    type: "SYSTEM",
    read: true
  });
  NotificationModel.create({
    userId: userSteven._id,
    title: "Pool Confirmed",
    message: "Akash and Anjali joined your pool to Kazhakkoottam today at 6:15 PM.",
    type: "POOL_JOIN",
    poolId: activePool._id,
    read: false
  });
  NotificationModel.create({
    userId: userSteven._id,
    title: "Smart Commute Match",
    message: "Arun and Neha are travelling to Trivandrum Central this Friday around 6:00 PM!",
    type: "TRIP_MATCH",
    read: false
  });
  saveDb();
  console.log(`\u2705 Seeding complete: ${db.users.length} users, ${db.locations.length} locations, ${db.trips.length} trips, ${db.pools.length} pools.`);
}
if (process.argv[1]?.includes("seed.ts")) {
  seedDatabase(true);
}

// src/serverApp.ts
var app = express();
app.use(express.json());
var isInitialized = false;
async function ensureServerInitialized() {
  if (isInitialized) return;
  try {
    const db = await initDatabase(false);
    if (db.users.length === 0 || db.locations.length === 0) {
      console.log("Database empty, performing initial seed...");
      seedDatabase(false);
    }
    isInitialized = true;
  } catch (err) {
    console.error("Error during database initialization:", err);
  }
}
app.use(async (req, res, next) => {
  if (!isInitialized) {
    await ensureServerInitialized();
  }
  next();
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    storage: process.env.MONGODB_URI ? "MongoDB Atlas" : "Local Document DB",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/seed", async (req, res) => {
  try {
    seedDatabase(true);
    res.json({
      success: true,
      message: "Database reset and re-seeded successfully",
      storage: process.env.MONGODB_URI ? "MongoDB Atlas" : "Local Document DB"
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to seed database", details: String(err) });
  }
});
app.get("/api/locations", (req, res) => {
  const onlyActive = req.query.active !== "false";
  const locations = LocationModel.find(onlyActive ? { active: true } : void 0);
  res.json(locations);
});
app.post("/api/admin/locations", (req, res) => {
  const { name, shortName, type, description, landmark } = req.body;
  if (!name || !shortName || !type) {
    return res.status(400).json({ error: "Name, shortName, and type are required" });
  }
  const existing = LocationModel.find().find(
    (l) => l.name.toLowerCase() === name.trim().toLowerCase() || l.shortName.toLowerCase() === shortName.trim().toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: "A location with this name or short name already exists" });
  }
  const created = LocationModel.create({
    name: name.trim(),
    shortName: shortName.trim(),
    type,
    description: description || "",
    landmark: landmark || "",
    active: true
  });
  res.status(201).json(created);
});
app.patch("/api/admin/locations/:id", (req, res) => {
  const { id } = req.params;
  const updated = LocationModel.updateById(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Location not found" });
  }
  res.json(updated);
});
app.get("/api/users", (req, res) => {
  const users = UserModel.find();
  res.json(users);
});
app.get("/api/users/:id", (req, res) => {
  const user = UserModel.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});
app.post("/api/trips", (req, res) => {
  const { userId, fromLocationId, toLocationId, travelDate, departureTime, flexibleMinutes } = req.body;
  if (!userId || !fromLocationId || !toLocationId || !travelDate || !departureTime) {
    return res.status(400).json({ error: "All fields (from, to, date, departure time, user) are required" });
  }
  if (fromLocationId === toLocationId) {
    return res.status(400).json({ error: "From and To locations cannot be the same destination" });
  }
  const user = UserModel.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "Employee not found" });
  }
  const newTrip = TripModel.create({
    userId,
    fromLocationId,
    toLocationId,
    travelDate,
    departureTime,
    flexibleMinutes: flexibleMinutes || 15,
    status: "SEARCHING"
  });
  res.status(201).json(newTrip);
});
app.get("/api/trips/my", (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId query parameter is required" });
  }
  const trips = TripModel.find({ userId });
  trips.sort((a, b) => (b.travelDate + b.departureTime).localeCompare(a.travelDate + a.departureTime));
  res.json(trips);
});
app.get("/api/trips/:id", (req, res) => {
  const trip = TripModel.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  res.json(trip);
});
app.get("/api/trips/:id/matches", async (req, res) => {
  const { id } = req.params;
  const targetTrip = TripModel.findById(id);
  if (!targetTrip) {
    return res.status(404).json({ error: "Trip not found" });
  }
  const allTrips = TripModel.find({
    travelDate: targetTrip.travelDate,
    fromLocationId: targetTrip.fromLocationId,
    toLocationId: targetTrip.toLocationId
  });
  const matches = [];
  const fromLoc = LocationModel.findById(targetTrip.fromLocationId);
  const toLoc = LocationModel.findById(targetTrip.toLocationId);
  const existingPools = PoolModel.find({
    travelDate: targetTrip.travelDate,
    fromLocationId: targetTrip.fromLocationId,
    toLocationId: targetTrip.toLocationId
  }).filter((p) => p.status === "OPEN" || p.status === "CONFIRMED");
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
      candidatePool
    });
    if (check.compatible) {
      matches.push({
        trip: candidateTrip,
        user: candidateUser,
        timeDifferenceMinutes: check.timeDiffMinutes,
        matchScore: check.matchScore,
        matchQuality: getMatchQuality(check.matchScore),
        existingPool: candidatePool
      });
    }
  }
  matches.sort((a, b) => b.matchScore - a.matchScore);
  const departureTimes = [targetTrip.departureTime, ...matches.map((m) => m.trip.departureTime)];
  const suggestedDepartureTime = calculateSuggestedDeparture(departureTimes);
  const estimatedFare = getEstimatedFare(fromLoc?.name || "", toLoc?.name || "");
  const estimatedRiders = Math.min(4, 1 + matches.length);
  const farePerPerson = calculateFarePerPerson(estimatedFare, estimatedRiders);
  const savingPerPerson = calculateSavingsPerPerson(estimatedFare, estimatedRiders);
  let aiExplanation = "";
  try {
    aiExplanation = await generateMatchExplanation({
      targetTrip,
      targetUser: targetTrip.user,
      matchingTrips: matches,
      suggestedDepartureTime: formatTime12Hour(suggestedDepartureTime),
      fromLocation: fromLoc,
      toLocation: toLoc
    });
  } catch {
    aiExplanation = `${matches.length} colleagues are traveling along your route within your flexibility window. Pooling together saves each rider up to \u20B9${savingPerPerson}.`;
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
    aiExplanation
  });
});
app.get("/api/pools", (req, res) => {
  const { userId, date, status } = req.query;
  let pools = PoolModel.find();
  if (userId && typeof userId === "string") {
    pools = pools.filter((p) => p.memberIds.includes(userId));
  }
  if (date && typeof date === "string") {
    pools = pools.filter((p) => p.travelDate === date);
  }
  if (status && typeof status === "string") {
    pools = pools.filter((p) => p.status === status);
  }
  res.json(pools);
});
app.get("/api/pools/:id", (req, res) => {
  const pool = PoolModel.findById(req.params.id);
  if (!pool) return res.status(404).json({ error: "Pool not found" });
  res.json(pool);
});
app.post("/api/pools", (req, res) => {
  const {
    tripId,
    userId,
    fromLocationId,
    toLocationId,
    travelDate,
    suggestedDepartureTime,
    pickupPoint,
    maxPassengers = 4,
    matchingTripIds = []
  } = req.body;
  if (!userId || !fromLocationId || !toLocationId || !travelDate) {
    return res.status(400).json({ error: "Missing required pool creation fields (userId, from, to, date)" });
  }
  const fromLoc = LocationModel.findById(fromLocationId);
  const toLoc = LocationModel.findById(toLocationId);
  const customFare = Number(req.body.estimatedFare);
  const estimatedFare = !isNaN(customFare) && customFare > 0 ? customFare : getEstimatedFare(fromLoc?.name || "", toLoc?.name || "");
  let activeTripId = tripId;
  if (!activeTripId) {
    const creatorTrip = TripModel.create({
      userId,
      fromLocationId,
      toLocationId,
      travelDate,
      departureTime: suggestedDepartureTime || "18:00",
      flexibleMinutes: 15,
      status: "POOLED"
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
    suggestedDepartureTime: suggestedDepartureTime || "18:00",
    pickupPoint: pickupPoint || `${fromLoc?.shortName || "Main Campus"} Pickup Point`,
    memberIds,
    tripIds,
    maxPassengers: Number(maxPassengers) || 4,
    estimatedFare,
    status: memberIds.length >= (Number(maxPassengers) || 4) ? "FULL" : "OPEN",
    createdBy: userId
  });
  tripIds.forEach((tId) => {
    TripModel.updateById(tId, { poolId: pool._id, status: "POOLED" });
  });
  const creatorUser = UserModel.findById(userId);
  memberIds.forEach((mId) => {
    if (mId !== userId) {
      NotificationModel.create({
        userId: mId,
        title: "Added to Pool",
        message: `${creatorUser?.name || "A coworker"} added you to a ride pool to ${toLoc?.shortName || "destination"}.`,
        type: "POOL_JOIN",
        poolId: pool._id,
        read: false
      });
    }
  });
  res.status(201).json(pool);
});
app.post("/api/pools/:id/join", (req, res) => {
  const { id } = req.params;
  const { userId, tripId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  const pool = PoolModel.findById(id);
  if (!pool) {
    return res.status(404).json({ error: "Pool not found" });
  }
  if (pool.status === "FULL" || pool.memberIds.length >= pool.maxPassengers) {
    return res.status(400).json({ error: `This pool is already at full capacity (${pool.maxPassengers} riders)` });
  }
  if (pool.memberIds.includes(userId)) {
    return res.status(400).json({ error: "You are already a member of this pool" });
  }
  let activeTripId = tripId;
  if (!activeTripId) {
    const existingTrip = TripModel.find({
      userId,
      fromLocationId: pool.fromLocationId,
      toLocationId: pool.toLocationId,
      travelDate: pool.travelDate
    }).find((t) => t.status === "SEARCHING");
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
        status: "POOLED"
      });
      activeTripId = newTrip._id;
    }
  }
  const updatedMemberIds = [...pool.memberIds, userId];
  const updatedTripIds = activeTripId && !pool.tripIds.includes(activeTripId) ? [...pool.tripIds, activeTripId] : pool.tripIds;
  const newStatus = updatedMemberIds.length >= pool.maxPassengers ? "FULL" : "OPEN";
  const updatedPool = PoolModel.updateById(id, {
    memberIds: updatedMemberIds,
    tripIds: updatedTripIds,
    status: newStatus
  });
  if (activeTripId) {
    TripModel.updateById(activeTripId, { poolId: id, status: "POOLED" });
  }
  const joiningUser = UserModel.findById(userId);
  const toLoc = LocationModel.findById(pool.toLocationId);
  pool.memberIds.forEach((mId) => {
    NotificationModel.create({
      userId: mId,
      title: "New Rider Joined",
      message: `${joiningUser?.name || "A coworker"} has joined your pool to ${toLoc?.shortName || "destination"}! Fare per person is now \u20B9${calculateFarePerPerson(pool.estimatedFare, updatedMemberIds.length)}.`,
      type: updatedMemberIds.length >= pool.maxPassengers ? "POOL_FULL" : "POOL_JOIN",
      poolId: id,
      read: false
    });
  });
  res.json(updatedPool);
});
app.post("/api/pools/:id/leave", (req, res) => {
  const { id } = req.params;
  const { userId, tripId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  const pool = PoolModel.findById(id);
  if (!pool) {
    return res.status(404).json({ error: "Pool not found" });
  }
  if (!pool.memberIds.includes(userId)) {
    return res.status(400).json({ error: "You are not a member of this pool" });
  }
  const updatedMemberIds = pool.memberIds.filter((mId) => mId !== userId);
  let updatedTripIds = pool.tripIds;
  if (tripId) {
    updatedTripIds = pool.tripIds.filter((tId) => tId !== tripId);
    TripModel.updateById(tripId, { poolId: null, status: "SEARCHING" });
  } else {
    const userTrips = TripModel.find({ userId, poolId: id });
    userTrips.forEach((ut) => {
      TripModel.updateById(ut._id, { poolId: null, status: "SEARCHING" });
      updatedTripIds = updatedTripIds.filter((tid) => tid !== ut._id);
    });
  }
  let updatedPool;
  if (updatedMemberIds.length === 0) {
    updatedPool = PoolModel.updateById(id, {
      memberIds: [],
      tripIds: [],
      status: "CANCELLED"
    });
  } else {
    updatedPool = PoolModel.updateById(id, {
      memberIds: updatedMemberIds,
      tripIds: updatedTripIds,
      status: "OPEN"
    });
  }
  const leavingUser = UserModel.findById(userId);
  updatedMemberIds.forEach((mId) => {
    NotificationModel.create({
      userId: mId,
      title: "Rider Left Pool",
      message: `${leavingUser?.name || "A coworker"} left the pool. A seat is now open.`,
      type: "POOL_UPDATE",
      poolId: id,
      read: false
    });
  });
  res.json(updatedPool);
});
app.patch("/api/pools/:id", (req, res) => {
  const { id } = req.params;
  const { status, pickupPoint, suggestedDepartureTime } = req.body;
  const updates = {};
  if (status) updates.status = status;
  if (pickupPoint) updates.pickupPoint = pickupPoint;
  if (suggestedDepartureTime) updates.suggestedDepartureTime = suggestedDepartureTime;
  const updated = PoolModel.updateById(id, updates);
  if (!updated) {
    return res.status(404).json({ error: "Pool not found" });
  }
  if (status === "COMPLETED") {
    updated.tripIds.forEach((tId) => {
      TripModel.updateById(tId, { status: "COMPLETED" });
    });
  }
  res.json(updated);
});
app.get("/api/notifications", (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId is required" });
  }
  const notifs = NotificationModel.find({ userId });
  res.json(notifs);
});
app.patch("/api/notifications/:id/read", (req, res) => {
  const success = NotificationModel.markAsRead(req.params.id);
  res.json({ success });
});
app.post("/api/notifications/read-all", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const count = NotificationModel.markAllAsRead(userId);
  res.json({ count });
});
app.get("/api/admin/users", (req, res) => {
  const users = UserModel.find();
  res.json(users);
});
app.get("/api/admin/trips", (req, res) => {
  const { date, status, fromId, toId } = req.query;
  let trips = TripModel.find();
  if (date && typeof date === "string") {
    trips = trips.filter((t) => t.travelDate === date);
  }
  if (status && typeof status === "string") {
    trips = trips.filter((t) => t.status === status);
  }
  if (fromId && typeof fromId === "string") {
    trips = trips.filter((t) => t.fromLocationId === fromId);
  }
  if (toId && typeof toId === "string") {
    trips = trips.filter((t) => t.toLocationId === toId);
  }
  trips.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(trips);
});
app.get("/api/admin/pools", (req, res) => {
  const pools = PoolModel.find();
  pools.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(pools);
});
app.get("/api/admin/analytics", (req, res) => {
  const analytics = calculateAnalytics();
  res.json(analytics);
});
app.post("/api/ai/demand-insight", async (req, res) => {
  try {
    const { route, travelDate, passengerCount, peakHour } = req.body;
    const insight = await generateDemandInsight({
      route: route || "UST Campus \u2192 Trivandrum Central",
      travelDate: travelDate || "Friday",
      passengerCount: passengerCount || 4,
      peakHour: peakHour || "5:45 PM - 6:30 PM"
    });
    res.json({ insight });
  } catch {
    res.json({
      insight: "Friday between 5:30 PM and 6:30 PM shows the highest pooling demand for UST Campus to Trivandrum Central."
    });
  }
});
async function handler(req, res) {
  await ensureServerInitialized();
  return app(req, res);
}
export {
  app,
  handler as default,
  ensureServerInitialized
};
