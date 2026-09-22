import {
  User,
  Location,
  Trip,
  Pool,
  Notification,
  SmartMatchResponse,
  AnalyticsData,
} from '../types';

export const api = {
  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async getUser(id: string): Promise<User> {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  // Locations
  async getLocations(activeOnly: boolean = true): Promise<Location[]> {
    const res = await fetch(`/api/locations?active=${activeOnly}`);
    if (!res.ok) throw new Error('Failed to fetch locations');
    return res.json();
  },

  async createLocation(data: Partial<Location>): Promise<Location> {
    const res = await fetch('/api/admin/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create location');
    }
    return res.json();
  },

  async updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
    const res = await fetch(`/api/admin/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update location');
    return res.json();
  },

  // Trips
  async createTrip(data: {
    userId: string;
    fromLocationId: string;
    toLocationId: string;
    travelDate: string;
    departureTime: string;
    flexibleMinutes?: number;
  }): Promise<Trip> {
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create trip');
    }
    return res.json();
  },

  async getMyTrips(userId: string): Promise<Trip[]> {
    const res = await fetch(`/api/trips/my?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch my trips');
    return res.json();
  },

  async getTrip(id: string): Promise<Trip> {
    const res = await fetch(`/api/trips/${id}`);
    if (!res.ok) throw new Error('Failed to fetch trip');
    return res.json();
  },

  async getTripMatches(tripId: string): Promise<SmartMatchResponse> {
    const res = await fetch(`/api/trips/${tripId}/matches`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch trip matches');
    }
    return res.json();
  },

  // Pools
  async getPools(params?: { userId?: string; date?: string; status?: string }): Promise<Pool[]> {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.date) searchParams.append('date', params.date);
    if (params?.status) searchParams.append('status', params.status);

    const res = await fetch(`/api/pools?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch pools');
    return res.json();
  },

  async getPool(id: string): Promise<Pool> {
    const res = await fetch(`/api/pools/${id}`);
    if (!res.ok) throw new Error('Failed to fetch pool');
    return res.json();
  },

  async createPool(data: {
    tripId?: string;
    userId: string;
    fromLocationId: string;
    toLocationId: string;
    travelDate: string;
    suggestedDepartureTime: string;
    pickupPoint?: string;
    maxPassengers?: number;
    matchingTripIds?: string[];
  }): Promise<Pool> {
    const res = await fetch('/api/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create pool');
    }
    return res.json();
  },

  async joinPool(poolId: string, userId: string, tripId?: string): Promise<Pool> {
    const res = await fetch(`/api/pools/${poolId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tripId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to join pool');
    }
    return res.json();
  },

  async leavePool(poolId: string, userId: string, tripId?: string): Promise<Pool> {
    const res = await fetch(`/api/pools/${poolId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tripId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to leave pool');
    }
    return res.json();
  },

  async updatePool(poolId: string, updates: Partial<Pool>): Promise<Pool> {
    const res = await fetch(`/api/pools/${poolId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update pool');
    }
    return res.json();
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    const res = await fetch(`/api/notifications?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  // Admin
  async getAdminTrips(params?: { date?: string; status?: string; fromId?: string; toId?: string }): Promise<Trip[]> {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.append('date', params.date);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.fromId) searchParams.append('fromId', params.fromId);
    if (params?.toId) searchParams.append('toId', params.toId);

    const res = await fetch(`/api/admin/trips?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch admin trips');
    return res.json();
  },

  async getAdminPools(): Promise<Pool[]> {
    const res = await fetch('/api/admin/pools');
    if (!res.ok) throw new Error('Failed to fetch admin pools');
    return res.json();
  },

  async getAdminAnalytics(): Promise<AnalyticsData> {
    const res = await fetch('/api/admin/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Seed reset
  async resetDatabase(): Promise<void> {
    const res = await fetch('/api/seed', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reseed database');
  },
};
