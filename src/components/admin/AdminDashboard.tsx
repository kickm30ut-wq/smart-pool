import React, { useState, useEffect } from 'react';
import { AnalyticsData, Location, Trip, Pool, User } from '../../types';
import { api } from '../../lib/api';
import { formatTime12Hour } from '../../lib/matching';
import { useToast } from '../ui/Toast';
import { AddLocationModal } from './AddLocationModal';
import {
  Users,
  Car,
  TrendingDown,
  Percent,
  CheckCircle2,
  MapPin,
  Clock,
  Calendar,
  Search,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
  Layers,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AdminDashboardProps {
  initialSubTab?: 'overview' | 'locations' | 'trips' | 'analytics';
  onViewPoolDetails: (poolId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialSubTab = 'overview',
  onViewPoolDetails,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'locations' | 'trips' | 'pools' | 'users' | 'analytics'>(
    initialSubTab
  );

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);

  // Filters
  const [locationSearch, setLocationSearch] = useState('');
  const [tripStatusFilter, setTripStatusFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [anData, locData, trData, poData, usData] = await Promise.all([
        api.getAdminAnalytics(),
        api.getLocations(false), // get all including inactive
        api.getAdminTrips(),
        api.getAdminPools(),
        api.getUsers(),
      ]);

      setAnalytics(anData);
      setLocations(locData);
      setTrips(trData);
      setPools(poData);
      setUsers(usData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Failed to load admin portal data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleLocationStatus = async (loc: Location) => {
    try {
      const updated = await api.updateLocation(loc._id, { active: !loc.active });
      setLocations(prev => prev.map(l => (l._id === loc._id ? updated : l)));
      showToast(
        `Location '${loc.shortName}' is now ${updated.active ? 'Active' : 'Deactivated'}`,
        'info'
      );
    } catch {
      showToast('Failed to update location status', 'error');
    }
  };

  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
    l.shortName.toLowerCase().includes(locationSearch.toLowerCase()) ||
    l.type.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const filteredTrips = trips.filter(t => {
    if (tripStatusFilter === 'ALL') return true;
    return t.status === tripStatusFilter;
  });

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.department.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.employeeId.toLowerCase().includes(userSearch.toLowerCase())
  );

  const COLORS = ['#047857', '#0d9488', '#0284c7', '#6366f1', '#8b5cf6', '#d97706'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Corporate Transport Admin
            </span>
            <span className="text-xs text-slate-300">UST Global Campus Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">
            Smart Pooling Management Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Monitor commute patterns, employee pooling adoption, peak travel windows, and campus hubs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddLocationOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Location</span>
          </button>
        </div>
      </div>

      {/* Admin KPI Summary Cards (Requirement 16) */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Total Employees */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
              Employees
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{analytics.totalEmployees}</div>
            <span className="text-[10px] text-slate-400">Registered badges</span>
          </div>

          {/* Card 2: Trips Recorded */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
              Trips Total
              <Car className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{trips.length}</div>
            <span className="text-[10px] text-slate-400">{analytics.tripsToday} scheduled today</span>
          </div>

          {/* Card 3: Active Pools */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
              Active Pools
              <Layers className="w-3.5 h-3.5 text-blue-500" />
            </span>
            <div className="text-2xl font-black text-blue-700 mt-1">{analytics.activePools}</div>
            <span className="text-[10px] text-slate-400">Open or confirmed</span>
          </div>

          {/* Card 4: Successful Pools */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
              Success Pools
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{analytics.successfulPools}</div>
            <span className="text-[10px] text-slate-400">Completed rides</span>
          </div>

          {/* Card 5: Estimated Total Savings */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
              Total Savings
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">₹{analytics.totalEstimatedSavings}</div>
            <span className="text-[10px] text-emerald-600 font-semibold">Employee savings</span>
          </div>

          {/* Card 6: Pooling Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
              Pooling Rate
              <Percent className="w-3.5 h-3.5 text-purple-500" />
            </span>
            <div className="text-2xl font-black text-purple-700 mt-1">{analytics.poolingRate}%</div>
            <span className="text-[10px] text-purple-600 font-semibold">Shared vs solo</span>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-bold w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-purple-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview & Demand
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'locations'
              ? 'bg-white text-purple-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Locations ({locations.length})
        </button>
        <button
          onClick={() => setActiveTab('trips')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'trips'
              ? 'bg-white text-purple-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Trips Log ({trips.length})
        </button>
        <button
          onClick={() => setActiveTab('pools')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'pools'
              ? 'bg-white text-purple-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pools ({pools.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'users'
              ? 'bg-white text-purple-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Employees ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'analytics'
              ? 'bg-white text-purple-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Visual Analytics
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Routes Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Top Commute Corridors</h3>
                <span className="text-xs text-slate-400 font-medium">By trips logged</span>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {analytics.popularRoutes.map((route, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{route.route}</div>
                      <div className="text-[11px] text-slate-500">
                        Total savings: ₹{route.savings}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        {route.count} trips
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Travel Windows */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Peak Departure Windows</h3>
                <span className="text-xs text-slate-400 font-medium">Shift departures</span>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {analytics.peakTravelWindows.map((win, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-slate-800">{win.timeWindow}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="bg-purple-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, (win.count / 30) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{win.count} trips</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Active Pools */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Recent Active Pools</h3>
              <button
                onClick={() => setActiveTab('pools')}
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                View All Pools →
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {pools.slice(0, 5).map(pool => (
                <div key={pool._id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {pool.fromLocation?.shortName} → {pool.toLocation?.shortName}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                      <span>{pool.travelDate}</span>
                      <span>•</span>
                      <span>{formatTime12Hour(pool.suggestedDepartureTime)}</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">
                        {pool.memberIds.length}/{pool.maxPassengers} Riders
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        pool.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : pool.status === 'FULL'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {pool.status}
                    </span>
                    <button
                      onClick={() => onViewPoolDetails(pool._id)}
                      className="px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOCATIONS MANAGEMENT (Requirement 17) */}
      {activeTab === 'locations' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Commute Locations & Hubs</h3>
              <p className="text-xs text-slate-500">
                Manage campus gates, transit stations, and authorized pickup coordinates
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search location..."
                  value={locationSearch}
                  onChange={e => setLocationSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={() => setIsAddLocationOpen(true)}
                className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Location Name</th>
                  <th className="py-2.5 px-3">Short Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Pickup Landmark</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLocations.map(loc => (
                  <tr key={loc._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{loc.name}</td>
                    <td className="py-3 px-3 text-slate-700">{loc.shortName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {loc.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {loc.landmark || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                      {loc.description || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          loc.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {loc.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleToggleLocationStatus(loc)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                          loc.active
                            ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {loc.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRIPS LOG (Requirement 18) */}
      {activeTab === 'trips' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">All Employee Trips</h3>
              <p className="text-xs text-slate-500">Live feed of planned and completed commute trips</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Filter:</span>
              <select
                value={tripStatusFilter}
                onChange={e => setTripStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="ALL">All Statuses ({trips.length})</option>
                <option value="SEARCHING">Searching</option>
                <option value="MATCHED">Matched</option>
                <option value="POOLED">Pooled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3">Travel Date</th>
                  <th className="py-2.5 px-3">Departure Time</th>
                  <th className="py-2.5 px-3">Flexibility</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Pool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrips.map(trip => (
                  <tr key={trip._id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{trip.user?.name || trip.userId}</div>
                      <div className="text-[10px] text-slate-500">
                        {trip.user?.department} • {trip.user?.employeeId}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {trip.fromLocation?.shortName} → {trip.toLocation?.shortName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{trip.travelDate}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatTime12Hour(trip.departureTime)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">±{trip.flexibleMinutes} min</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          trip.status === 'POOLED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : trip.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : trip.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {trip.poolId ? (
                        <button
                          onClick={() => onViewPoolDetails(trip.poolId!)}
                          className="text-xs font-bold text-purple-700 hover:underline"
                        >
                          View Pool
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: POOLS LOG (Requirement 19) */}
      {activeTab === 'pools' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">All Commute Pools</h3>
              <p className="text-xs text-slate-500">Formed passenger groups and fare splits</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg">
              {pools.length} Total Pools
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Departure</th>
                  <th className="py-2.5 px-3">Members</th>
                  <th className="py-2.5 px-3">Est. Auto Fare</th>
                  <th className="py-2.5 px-3">Fare / Rider</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pools.map(pool => {
                  const riderCount = pool.memberIds.length;
                  const perRider = Math.round(pool.estimatedFare / riderCount);

                  return (
                    <tr key={pool._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {pool.fromLocation?.shortName} → {pool.toLocation?.shortName}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{pool.travelDate}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {formatTime12Hour(pool.suggestedDepartureTime)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-semibold text-slate-800">
                          {riderCount} / {pool.maxPassengers} riders
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">₹{pool.estimatedFare}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">₹{perRider}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pool.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pool.status === 'FULL'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {pool.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onViewPoolDetails(pool._id)}
                          className="text-xs font-bold text-purple-700 hover:bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: USERS DIRECTORY (Requirement 20) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Employee Directory</h3>
              <p className="text-xs text-slate-500">Registered UST employees for smart pooling</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employee / department..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Badge ID</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Corporate Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                          {user.initials}
                        </div>
                        <span className="font-bold text-slate-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600">{user.employeeId}</td>
                    <td className="py-3 px-3 text-slate-700">{user.department}</td>
                    <td className="py-3 px-3 text-slate-500">{user.email}</td>
                    <td className="py-3 px-3 text-slate-500">{user.phone || '—'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: DEMAND ANALYTICS WITH RECHARTS (Requirement 21) */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Peak Travel Times Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Peak Commute Time Window Distribution
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Employee departure density across major shift closure windows
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.peakTravelWindows}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timeWindow" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Trips" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Route Popularity Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-1">Popular Commute Corridors</h3>
              <p className="text-xs text-slate-500 mb-4">Volume of shared trips by route destination</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.popularRoutes}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="route"
                      type="category"
                      width={140}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#059669" radius={[0, 6, 6, 0]} name="Trips" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Environmental & Financial Impact Box */}
          <div className="bg-gradient-to-r from-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-md">
            <h3 className="font-bold text-base text-emerald-400">
              Enterprise Sustainability & Mobility ROI
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              By pooling rides, UST employees prevent duplicate vehicle dispatches, reduce gate congestion, and save collective travel allowances.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-4 border-t border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Estimated Total Savings</span>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  ₹{analytics.totalEstimatedSavings}
                </div>
                <span className="text-[10px] text-slate-400">Saved by employees to date</span>
              </div>

              <div>
                <span className="text-xs text-slate-400">Carbon Emission Reduction</span>
                <div className="text-2xl font-black text-teal-400 mt-0.5">~148 kg CO₂</div>
                <span className="text-[10px] text-slate-400">Estimated vehicle emissions avoided</span>
              </div>

              <div>
                <span className="text-xs text-slate-400">Overall Pooling Rate</span>
                <div className="text-2xl font-black text-white mt-0.5">{analytics.poolingRate}%</div>
                <span className="text-[10px] text-emerald-400 font-semibold">Of recorded commutes bundled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddLocationOpen}
        onClose={() => setIsAddLocationOpen(false)}
        onLocationAdded={loadData}
      />
    </div>
  );
};
