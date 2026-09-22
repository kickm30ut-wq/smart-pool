import mongoose, { Schema, Document } from 'mongoose';
import { User, Location, Trip, Pool, Notification } from '../types';

// MongoDB Connection Cache for Node & Serverless (Vercel)
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// ---------------------------------------------------------------------------
// MONGOOSE SCHEMAS
// ---------------------------------------------------------------------------

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    employeeId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String },
    initials: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, enum: ['EMPLOYEE', 'ADMIN'], default: 'EMPLOYEE' },
    active: { type: Boolean, default: true },
    phone: { type: String },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  { _id: false, timestamps: false, collection: 'users' }
);

const LocationSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, default: '' },
    landmark: { type: String, default: '' },
    active: { type: Boolean, default: true },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  { _id: false, timestamps: false, collection: 'locations' }
);

const TripSchema = new Schema(
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
      enum: ['SEARCHING', 'MATCHED', 'POOLED', 'COMPLETED', 'CANCELLED'],
      default: 'SEARCHING',
    },
    poolId: { type: String, default: null },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  { _id: false, timestamps: false, collection: 'trips' }
);

const PoolSchema = new Schema(
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
      enum: ['OPEN', 'FULL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
      default: 'OPEN',
    },
    createdBy: { type: String, required: true },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  { _id: false, timestamps: false, collection: 'pools' }
);

const NotificationSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: { type: String, required: true },
    poolId: { type: String },
    createdAt: { type: String },
  },
  { _id: false, timestamps: false, collection: 'notifications' }
);

// Models
export const MongoUserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const MongoLocationModel = mongoose.models.Location || mongoose.model('Location', LocationSchema);
export const MongoTripModel = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
export const MongoPoolModel = mongoose.models.Pool || mongoose.model('Pool', PoolSchema);
export const MongoNotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

// Connection Manager
export async function connectToMongoDB(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '') {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then(m => {
      console.log('✅ Connected to MongoDB Atlas successfully');
      return m;
    }).catch(err => {
      console.warn('⚠️ MongoDB connection error, continuing with local storage:', err.message);
      cached.promise = null;
      return null as any;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch {
    cached.conn = null;
  }

  return cached.conn;
}

export function isMongoDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Data Synchronization Functions
export async function loadDataFromMongoDB(): Promise<{
  users: User[];
  locations: Location[];
  trips: Trip[];
  pools: Pool[];
  notifications: Notification[];
} | null> {
  const conn = await connectToMongoDB();
  if (!conn || !isMongoDBConnected()) {
    return null;
  }

  try {
    const [users, locations, trips, pools, notifications] = await Promise.all([
      MongoUserModel.find({}).lean() as Promise<User[]>,
      MongoLocationModel.find({}).lean() as Promise<Location[]>,
      MongoTripModel.find({}).lean() as Promise<Trip[]>,
      MongoPoolModel.find({}).lean() as Promise<Pool[]>,
      MongoNotificationModel.find({}).lean() as Promise<Notification[]>,
    ]);

    return {
      users: (users || []).map(u => ({ ...u, _id: String(u._id) })),
      locations: (locations || []).map(l => ({ ...l, _id: String(l._id) })),
      trips: (trips || []).map(t => ({ ...t, _id: String(t._id) })),
      pools: (pools || []).map(p => ({ ...p, _id: String(p._id) })),
      notifications: (notifications || []).map(n => ({ ...n, _id: String(n._id) })),
    };
  } catch (err) {
    console.warn('Error loading collections from MongoDB Atlas:', err);
    return null;
  }
}

export async function saveAllToMongoDB(data: {
  users: User[];
  locations: Location[];
  trips: Trip[];
  pools: Pool[];
  notifications: Notification[];
}): Promise<boolean> {
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
      MongoNotificationModel.deleteMany({}),
    ]);

    await Promise.all([
      data.users.length > 0 ? MongoUserModel.insertMany(data.users) : Promise.resolve(),
      data.locations.length > 0 ? MongoLocationModel.insertMany(data.locations) : Promise.resolve(),
      data.trips.length > 0 ? MongoTripModel.insertMany(data.trips) : Promise.resolve(),
      data.pools.length > 0 ? MongoPoolModel.insertMany(data.pools) : Promise.resolve(),
      data.notifications.length > 0 ? MongoNotificationModel.insertMany(data.notifications) : Promise.resolve(),
    ]);

    console.log('✅ Synchronized dataset to MongoDB Atlas successfully');
    return true;
  } catch (err) {
    console.error('Failed to sync dataset to MongoDB Atlas:', err);
    return false;
  }
}

export async function upsertMongoDoc(
  collection: 'users' | 'locations' | 'trips' | 'pools' | 'notifications',
  doc: any
): Promise<void> {
  if (!isMongoDBConnected()) return;

  try {
    const model =
      collection === 'users'
        ? MongoUserModel
        : collection === 'locations'
        ? MongoLocationModel
        : collection === 'trips'
        ? MongoTripModel
        : collection === 'pools'
        ? MongoPoolModel
        : MongoNotificationModel;

    await model.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
  } catch (err) {
    console.warn(`Could not sync ${collection} document to MongoDB Atlas:`, err);
  }
}

export async function deleteMongoDoc(
  collection: 'trips' | 'pools' | 'notifications',
  id: string
): Promise<void> {
  if (!isMongoDBConnected()) return;

  try {
    const model =
      collection === 'trips'
        ? MongoTripModel
        : collection === 'pools'
        ? MongoPoolModel
        : MongoNotificationModel;

    await model.deleteOne({ _id: id });
  } catch (err) {
    console.warn(`Could not delete ${collection} document from MongoDB Atlas:`, err);
  }
}
