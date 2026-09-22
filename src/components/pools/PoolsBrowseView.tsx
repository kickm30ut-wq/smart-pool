import React, { useState, useEffect } from 'react';
import { Pool, Location } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { formatTime12Hour } from '../../lib/matching';
import { calculateFarePerPerson, calculateSavingsPerPerson } from '../../lib/fare';
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  Users,
  PlusCircle,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

interface PoolsBrowseViewProps {
  onOpenCreatePool: () => void;
  onViewPoolDetails: (poolId: string) => void;
  onSwitchToFindMatch?: () => void;
}

export const PoolsBrowseView: React.FC<PoolsBrowseViewProps> = ({
  onOpenCreatePool,
  onViewPoolDetails,
  onSwitchToFindMatch,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [pools, setPools] = useState<Pool[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [joiningPoolId, setJoiningPoolId] = useState<string | null>(null);

  // Filters
  const [filterDestination, setFilterDestination] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN'>('OPEN');

  const loadPools = async () => {
    try {
      setLoading(true);
      const [allPools, allLocs] = await Promise.all([
        api.getPools(),
        api.getLocations(true),
      ]);
      setPools(allPools);
      setLocations(allLocs);
    } catch {
      showToast('Failed to load ride pools', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPools();
  }, [currentUser]);

  const handleJoinPool = async (pool: Pool) => {
    if (!currentUser) {
      showToast('Please login to join a pool', 'error');
      return;
    }

    try {
      setJoiningPoolId(pool._id);
      const updated = await api.joinPool(pool._id, currentUser._id);
      showToast('Joined pool successfully! Your seat is confirmed.', 'success');
      // Refresh list
      await loadPools();
      onViewPoolDetails(updated._id);
    } catch (err: any) {
      showToast(err.message || 'Failed to join pool', 'error');
    } finally {
      setJoiningPoolId(null);
    }
  };

  // Filter pools
  const filteredPools = pools.filter(p => {
    if (filterStatus === 'OPEN' && p.status !== 'OPEN') return false;
    if (filterDestination !== 'all' && p.toLocationId !== filterDestination) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-700/70 text-emerald-100 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" /> Campus Commute Pools
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200">
              {filteredPools.length} Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Browse & Join Coworker Pools
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl mt-1.5 leading-relaxed">
            Find an open ride pool created by employees heading your way, reserve your seat in 1 click, or start a new pool for your route!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onSwitchToFindMatch && (
            <button
              onClick={onSwitchToFindMatch}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl transition-all border border-white/20 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Smart Match Trips</span>
            </button>
          )}

          <button
            onClick={onOpenCreatePool}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Create Pool</span>
          </button>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          {/* Destination Filter */}
          <select
            value={filterDestination}
            onChange={e => setFilterDestination(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Destinations</option>
            {locations.map(loc => (
              <option key={loc._id} value={loc._id}>
                To: {loc.shortName}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterStatus('OPEN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'OPEN'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open Seats Only
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Pools
            </button>
          </div>
        </div>

        <button
          onClick={loadPools}
          disabled={loading}
          className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Pools Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading coworker pools...</p>
        </div>
      ) : filteredPools.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <Car className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">No Pools Found</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            There are no pools matching your filter right now. Be the first employee to start a pool on this route!
          </p>
          <button
            onClick={onOpenCreatePool}
            className="mt-6 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 transition-all inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create the First Pool</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPools.map(pool => {
            const isUserMember = currentUser ? pool.memberIds.includes(currentUser._id) : false;
            const isHost = currentUser ? pool.createdBy === currentUser._id : false;
            const seatsLeft = pool.maxPassengers - pool.memberIds.length;
            const isFull = pool.memberIds.length >= pool.maxPassengers || pool.status === 'FULL';
            const farePerRider = calculateFarePerPerson(pool.estimatedFare, pool.memberIds.length);
            const savings = calculateSavingsPerPerson(pool.estimatedFare, pool.memberIds.length);

            return (
              <div
                key={pool._id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  isUserMember
                    ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header: Route & Status */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {pool.travelDate}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isFull
                            ? 'bg-rose-100 text-rose-800'
                            : seatsLeft === 1
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isFull ? 'Full (0 Seats)' : `${seatsLeft} Seat${seatsLeft > 1 ? 's' : ''} Left`}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{pool.fromLocation?.shortName || 'UST Campus'}</span>
                      <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-950">{pool.toLocation?.shortName || 'Destination'}</span>
                    </h3>

                    <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Departs {formatTime12Hour(pool.suggestedDepartureTime)}</span>
                    </div>

                    {pool.pickupPoint && (
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{pool.pickupPoint}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body: Riders & Seat Circles */}
                  <div className="p-5 space-y-4">
                    {/* Host badge */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Host:</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                          {pool.creator?.initials || 'H'}
                        </span>
                        <span>{pool.creator?.name || 'Coworker'} {isHost && '(You)'}</span>
                      </span>
                    </div>

                    {/* Seat Visualizer */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2">
                        <span>Riders ({pool.memberIds.length}/{pool.maxPassengers})</span>
                        <span className="text-emerald-700">₹{farePerRider}/rider</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Render joined members */}
                        {pool.members?.map((member, idx) => (
                          <div
                            key={member._id || idx}
                            title={`${member.name} (${member.department})`}
                            className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs border-2 border-white ring-1 ring-emerald-600/20"
                          >
                            {member.initials}
                          </div>
                        ))}

                        {/* Render empty seat slots */}
                        {Array.from({ length: seatsLeft }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 text-slate-400 flex items-center justify-center text-xs font-semibold bg-slate-50/70"
                            title="Empty seat"
                          >
                            +
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Savings banner */}
                    <div className="bg-emerald-50/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Saves each rider ₹{savings}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">Total: ₹{pool.estimatedFare}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewPoolDetails(pool._id)}
                    className="text-xs font-bold text-slate-700 hover:text-emerald-800 transition-colors"
                  >
                    View Details
                  </button>

                  {isUserMember ? (
                    <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>You're in</span>
                    </span>
                  ) : isFull ? (
                    <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed">
                      Pool Full
                    </span>
                  ) : (
                    <button
                      onClick={() => handleJoinPool(pool)}
                      disabled={joiningPoolId === pool._id}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl shadow-xs shadow-emerald-700/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>{joiningPoolId === pool._id ? 'Joining...' : `Join (₹${farePerRider})`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
