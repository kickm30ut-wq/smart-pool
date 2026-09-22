import React, { useState, useEffect } from 'react';
import { Trip, Pool } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatTime12Hour } from '../../lib/matching';
import { getEstimatedFare, calculateFarePerPerson } from '../../lib/fare';
import {
  Car,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  TrendingDown,
  Compass,
  AlertCircle,
} from 'lucide-react';

interface MyTripsViewProps {
  onViewPool: (poolId: string) => void;
  onFindPool: () => void;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({ onViewPool, onFindPool }) => {
  const { currentUser } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('UPCOMING');
  const [loading, setLoading] = useState(true);

  const fetchTripsAndPools = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [tData, pData] = await Promise.all([
        api.getMyTrips(currentUser._id),
        api.getPools(),
      ]);
      setTrips(tData);
      setPools(pData);
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsAndPools();
  }, [currentUser]);

  const filteredTrips = trips.filter(trip => {
    if (activeTab === 'UPCOMING') {
      return trip.status === 'SEARCHING' || trip.status === 'MATCHED' || trip.status === 'POOLED';
    }
    if (activeTab === 'COMPLETED') {
      return trip.status === 'COMPLETED';
    }
    if (activeTab === 'CANCELLED') {
      return trip.status === 'CANCELLED';
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Trips</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track all your active ride coordination requests and past completed pools.
          </p>
        </div>

        <button
          onClick={onFindPool}
          className="self-start sm:self-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5"
        >
          <Compass className="w-4 h-4" />
          <span>Post New Commute</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl w-fit text-xs font-bold">
        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'UPCOMING'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upcoming Rides
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'COMPLETED'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setActiveTab('CANCELLED')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'CANCELLED'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Trips Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading your trips...</div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No {activeTab.toLowerCase()} trips found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'UPCOMING'
                ? "You haven't posted any upcoming commutes. Click 'Post New Commute' to find pool partners."
                : 'No historical trips recorded under this status.'}
            </p>
          </div>
        ) : (
          filteredTrips.map(trip => {
            const pool = trip.pool || (trip.poolId ? pools.find(p => p._id === trip.poolId) : null);
            const routeFare = getEstimatedFare(
              trip.fromLocation?.name || pool?.fromLocation?.name || '',
              trip.toLocation?.name || pool?.toLocation?.name || ''
            );
            const estimatedFare = pool?.estimatedFare || routeFare;
            const riderCount = pool?.memberIds?.length || pool?.members?.length || 1;
            const fareShare = calculateFarePerPerson(estimatedFare, riderCount);
            const savings = Math.max(0, estimatedFare - fareShare);

            return (
              <div
                key={trip._id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Route & Times */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        trip.status === 'POOLED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : trip.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : trip.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {trip.status === 'POOLED' ? 'POOL CONFIRMED' : trip.status}
                    </span>

                    {pool && (
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {riderCount} / {pool.maxPassengers} riders
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {trip.fromLocation?.shortName || 'UST Campus'} →{' '}
                    {trip.toLocation?.shortName || 'Destination'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {trip.travelDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatTime12Hour(trip.departureTime)} (±{trip.flexibleMinutes}m)
                    </span>
                  </div>
                </div>

                {/* Fare & Details CTA */}
                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-[11px] text-slate-400 font-medium">Your Fare Share</div>
                    <div className="text-lg font-black text-slate-900">
                      {trip.status === 'POOLED' || trip.status === 'COMPLETED'
                        ? `₹${fareShare}`
                        : `~₹${estimatedFare}`}
                    </div>
                    {riderCount > 1 && savings > 0 && (
                      <div className="text-[10px] font-bold text-emerald-700">
                        ₹{savings} saved
                      </div>
                    )}
                  </div>

                  {trip.poolId ? (
                    <button
                      onClick={() => onViewPool(trip.poolId!)}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                    >
                      <span>View Pool</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onFindPool()}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Find Matches
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
