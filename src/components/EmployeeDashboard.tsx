import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Location, Trip, Pool } from '../types';
import { formatTime12Hour } from '../lib/matching';
import { useToast } from './ui/Toast';
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Users,
  TrendingDown,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Compass,
  Plus,
} from 'lucide-react';

interface EmployeeDashboardProps {
  onFindPool: (pref?: { fromId?: string; toId?: string; date?: string; time?: string }) => void;
  onViewPool: (poolId: string) => void;
  onViewMyTrips: () => void;
  onOpenCreatePool: () => void;
  onBrowsePools: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onFindPool,
  onViewPool,
  onViewMyTrips,
  onOpenCreatePool,
  onBrowsePools,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [fromLocationId, setFromLocationId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');
  const [travelDate, setTravelDate] = useState<string>('2026-09-25');
  const [departureTime, setDepartureTime] = useState<string>('18:00');

  const [upcomingPool, setUpcomingPool] = useState<Pool | null>(null);
  const [openCoworkerPools, setOpenCoworkerPools] = useState<Pool[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const [locs, myPools, allPools, trips] = await Promise.all([
          api.getLocations(true),
          api.getPools({ userId: currentUser._id }),
          api.getPools(),
          api.getMyTrips(currentUser._id),
        ]);

        setLocations(locs);
        if (locs.length > 0) {
          const ust = locs.find(l => l.name.includes('UST')) || locs[0];
          setFromLocationId(ust._id);
        }
        if (locs.length > 1) {
          const tvc = locs.find(l => l.name.includes('Central') || l.name.includes('Railway')) || locs[1];
          setToLocationId(tvc._id);
        }

        // Find active upcoming pool for this user
        const active = myPools.find(p => p.status === 'OPEN' || p.status === 'CONFIRMED' || p.status === 'FULL');
        setUpcomingPool(active || null);

        // Find other open coworker pools that user hasn't joined yet
        const openOthers = allPools.filter(
          p => p.status === 'OPEN' && !p.memberIds.includes(currentUser._id)
        );
        setOpenCoworkerPools(openOthers.slice(0, 3));

        // Recent trips (limit to 3)
        setRecentTrips(trips.slice(0, 3));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser]);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFindPool({
      fromId: fromLocationId,
      toId: toLocationId,
      date: travelDate,
      time: departureTime,
    });
  };

  const firstName = currentUser?.name.split(' ')[0] || 'Coworker';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Greeting Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {currentUser?.department} • Ready to coordinate your commute and share fares?
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenCreatePool}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pool</span>
          </button>
          <button
            onClick={onBrowsePools}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Car className="w-4 h-4 text-emerald-600" />
            <span>Browse Pools</span>
          </button>
          <div className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-semibold">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span>Avg. ₹120 saved per shared trip</span>
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Quick Trip Search) + Right Column (Upcoming Ride & Smart Suggestions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Quick Trip Search Card (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5 mb-1">
              <Compass className="w-3.5 h-3.5" /> Plan Commute
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Where are you heading?</h2>
            <p className="text-xs text-emerald-100 mt-1">
              Set your destination and time window to instantly match with coworkers.
            </p>
          </div>

          <form onSubmit={handleQuickSearchSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  From (Pickup)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-700 absolute left-3.5 top-3 pointer-events-none" />
                  <select
                    value={fromLocationId}
                    onChange={e => setFromLocationId(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    {locations.map(loc => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  To (Drop-off)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-teal-700 absolute left-3.5 top-3 pointer-events-none" />
                  <select
                    value={toLocationId}
                    onChange={e => setToLocationId(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    {locations.map(loc => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Travel Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="date"
                    value={travelDate}
                    onChange={e => setTravelDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Departure Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="time"
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Matches are automatically calculated with ±15m flexibility.
              </span>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/25 transition-all flex items-center gap-2"
              >
                <span>Find My Pool</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs bg-slate-50 -mx-6 -mb-6 px-6 py-3 border-t border-slate-200">
              <span className="text-slate-600 font-medium">Want to host and open seats for coworkers directly?</span>
              <button
                type="button"
                onClick={onOpenCreatePool}
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <span>Create a Pool</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Upcoming Ride & Smart Suggestions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Open Coworker Pools Widget */}
          {openCoworkerPools.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-emerald-600" /> Open Coworker Pools
                </span>
                <button
                  onClick={onBrowsePools}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  View All →
                </button>
              </div>

              <div className="space-y-2.5">
                {openCoworkerPools.map(pool => {
                  const seatsLeft = pool.maxPassengers - pool.memberIds.length;
                  return (
                    <div
                      key={pool._id}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-200 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {pool.fromLocation?.shortName || 'UST'} → {pool.toLocation?.shortName || 'Central'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{formatTime12Hour(pool.suggestedDepartureTime)}</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-700">{seatsLeft} seat{seatsLeft > 1 ? 's' : ''} left</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onViewPool(pool._id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors shrink-0 shadow-xs"
                      >
                        Join / View
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Upcoming Ride Card (Requirement 7) */}
          {upcomingPool ? (
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/80 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Car className="w-4 h-4" /> Upcoming Ride
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {upcomingPool.memberIds.length}/{upcomingPool.maxPassengers} riders
                </span>
              </div>

              <div className="mt-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {upcomingPool.fromLocation?.shortName || 'UST Campus'} →{' '}
                  {upcomingPool.toLocation?.shortName || 'Trivandrum Central'}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>{upcomingPool.travelDate}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">
                    {formatTime12Hour(upcomingPool.suggestedDepartureTime)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  <span className="font-semibold text-slate-700">Pickup:</span>{' '}
                  {upcomingPool.pickupPoint || 'Main Gate, UST Campus'}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-500">Your Share: </span>
                  <span className="font-bold text-emerald-700">
                    ₹{Math.round(upcomingPool.estimatedFare / upcomingPool.memberIds.length)}
                  </span>
                </div>

                <button
                  onClick={() => onViewPool(upcomingPool._id)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>View Pool</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Upcoming Ride
              </span>
              <p className="text-xs text-slate-500 mt-2">
                No active pools confirmed yet for your profile. Post a trip using the form to find one!
              </p>
            </div>
          )}

          {/* Smart Suggestions Card (Requirement 7) */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-base shadow-xs">
                🔥
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Smart Suggestion
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                  4 employees are travelling towards Trivandrum Central around 6 PM this Friday!
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Join Steven, Arun, and Neha to split the ₹180 fare and reduce pickup waiting time.
                </p>

                <button
                  onClick={() =>
                    onFindPool({
                      date: '2026-09-25',
                      time: '18:00',
                    })
                  }
                  className="mt-3.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>View Matches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips Section (Requirement 7) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Trips & Pools</h3>
            <p className="text-xs text-slate-500">Your recent ride pooling activities</p>
          </div>
          <button
            onClick={onViewMyTrips}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
          >
            <span>View All Trips</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {recentTrips.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No recent trips posted yet.
            </div>
          ) : (
            recentTrips.map(trip => (
              <div
                key={trip._id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      trip.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : trip.status === 'POOLED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {trip.fromLocation?.shortName || 'UST Campus'} →{' '}
                      {trip.toLocation?.shortName || 'Destination'}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{trip.travelDate}</span>
                      <span>•</span>
                      <span>{formatTime12Hour(trip.departureTime)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      trip.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : trip.status === 'POOLED'
                        ? 'bg-blue-100 text-blue-800'
                        : trip.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {trip.status}
                  </span>

                  {trip.poolId && (
                    <button
                      onClick={() => onViewPool(trip.poolId!)}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Pool Details →
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
