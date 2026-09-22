import React, { useState, useEffect } from 'react';
import { Location, Trip, SmartMatchResponse, MatchResult, Pool } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { formatTime12Hour } from '../../lib/matching';
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Users,
  CheckCircle2,
  TrendingDown,
  AlertCircle,
  ChevronRight,
  Sliders,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';

interface FindPoolViewProps {
  initialFromId?: string;
  initialToId?: string;
  initialDate?: string;
  initialTime?: string;
  onPoolJoined: (poolId: string) => void;
  onNavigateToTrips: () => void;
  onOpenCreatePool?: () => void;
}

export const FindPoolView: React.FC<FindPoolViewProps> = ({
  initialFromId,
  initialToId,
  initialDate,
  initialTime,
  onPoolJoined,
  onNavigateToTrips,
  onOpenCreatePool,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [fromLocationId, setFromLocationId] = useState<string>(initialFromId || '');
  const [toLocationId, setToLocationId] = useState<string>(initialToId || '');
  const [travelDate, setTravelDate] = useState<string>(initialDate || '2026-09-25');
  const [departureTime, setDepartureTime] = useState<string>(initialTime || '18:00');
  const [flexibleMinutes, setFlexibleMinutes] = useState<10 | 15 | 30>(15);

  const [isSearching, setIsSearching] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);
  const [matchData, setMatchData] = useState<SmartMatchResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Load locations on mount
  useEffect(() => {
    const loadLocs = async () => {
      try {
        const data = await api.getLocations(true);
        setLocations(data);
        if (!fromLocationId && data.length > 0) {
          const ust = data.find(l => l.name.includes('UST')) || data[0];
          setFromLocationId(ust._id);
        }
        if (!toLocationId && data.length > 1) {
          const tvc = data.find(l => l.name.includes('Central') || l.name.includes('Railway')) || data[1];
          setToLocationId(tvc._id);
        }
      } catch {
        showToast('Failed to load campus locations', 'error');
      }
    };
    loadLocs();
  }, []);

  const handleFindPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please login as a demo employee first', 'error');
      return;
    }

    if (!fromLocationId || !toLocationId) {
      showToast('Please select both Origin and Destination', 'error');
      return;
    }

    if (fromLocationId === toLocationId) {
      showToast('Origin and Destination cannot be the same', 'error');
      return;
    }

    if (!travelDate) {
      showToast('Please pick a valid travel date', 'error');
      return;
    }

    if (!departureTime) {
      showToast('Please specify an approximate departure time', 'error');
      return;
    }

    try {
      setIsSearching(true);
      // 1. Post/Register the Trip
      const trip = await api.createTrip({
        userId: currentUser._id,
        fromLocationId,
        toLocationId,
        travelDate,
        departureTime,
        flexibleMinutes,
      });

      setCreatedTrip(trip);

      // 2. Query Smart Matching Engine
      const matches = await api.getTripMatches(trip._id);
      setMatchData(matches);
      setHasSearched(true);

      if (matches.matches.length > 0) {
        showToast(`Found ${matches.matches.length} compatible coworker trip(s)!`, 'success');
      } else {
        showToast('Trip registered! No immediate matches found.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating trip and finding matches', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinOrCreatePool = async () => {
    if (!currentUser || !createdTrip || !matchData) return;

    try {
      setIsJoining(true);

      // Check if an existing pool exists with capacity
      if (matchData.existingPools && matchData.existingPools.length > 0) {
        const poolToJoin = matchData.existingPools[0];
        const updated = await api.joinPool(poolToJoin._id, currentUser._id, createdTrip._id);
        showToast('Joined pool successfully!', 'success');
        onPoolJoined(updated._id);
        return;
      }

      // Check if any matched candidate already has a pool
      const matchedWithPool = matchData.matches.find(m => m.existingPool && m.existingPool.memberIds.length < 4);
      if (matchedWithPool && matchedWithPool.existingPool) {
        const updated = await api.joinPool(matchedWithPool.existingPool._id, currentUser._id, createdTrip._id);
        showToast('Joined pool successfully!', 'success');
        onPoolJoined(updated._id);
        return;
      }

      // Otherwise, create a new pool and bundle compatible trips
      const matchingTripIds = matchData.matches.slice(0, 3).map(m => m.trip._id);
      const newPool = await api.createPool({
        tripId: createdTrip._id,
        userId: currentUser._id,
        fromLocationId: createdTrip.fromLocationId,
        toLocationId: createdTrip.toLocationId,
        travelDate: createdTrip.travelDate,
        suggestedDepartureTime: matchData.suggestedDepartureTime,
        pickupPoint: 'Main Gate Security Gate 1, UST Campus',
        matchingTripIds,
      });

      showToast(`Pool created with ${1 + matchingTripIds.length} members!`, 'success');
      onPoolJoined(newPool._id);
    } catch (err: any) {
      showToast(err.message || 'Failed to join/create pool', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleResetSearch = () => {
    setHasSearched(false);
    setMatchData(null);
    setCreatedTrip(null);
  };

  const fromLocation = locations.find(l => l._id === fromLocationId);
  const toLocation = locations.find(l => l._id === toLocationId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search Formulation Card (Shown if not yet searched, or can be toggled) */}
      {!hasSearched ? (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                  <Car className="w-4 h-4" /> Ride Coordination
                </span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">Where are you heading?</h2>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
                Post your planned commute and discover colleagues travelling along the same route around the same time.
              </p>
            </div>

            {onOpenCreatePool && (
              <button
                type="button"
                onClick={onOpenCreatePool}
                className="self-start sm:self-center px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Pool Instead</span>
              </button>
            )}
          </div>

          <form onSubmit={handleFindPool} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Origin Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  From (Pickup Location)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <select
                    value={fromLocationId}
                    onChange={e => setFromLocationId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    required
                  >
                    {locations.map(loc => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>
                {fromLocation && (
                  <p className="text-[11px] text-slate-500 mt-1.5 ml-1">
                    Landmark: {fromLocation.landmark || fromLocation.description}
                  </p>
                )}
              </div>

              {/* Destination Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  To (Drop-off Destination)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-700">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <select
                    value={toLocationId}
                    onChange={e => setToLocationId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    required
                  >
                    {locations.map(loc => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>
                {toLocation && (
                  <p className="text-[11px] text-slate-500 mt-1.5 ml-1">
                    Landmark: {toLocation.landmark || toLocation.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              {/* Travel Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={e => setTravelDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setTravelDate('2026-09-25')}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  >
                    Friday (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelDate('2026-09-22')}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Approximate Departure Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Approx. Departure Time
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Standard shift end: 5:45 - 6:30 PM
                </p>
              </div>

              {/* Flexible Window */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Time Flexibility Window
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([10, 15, 30] as const).map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setFlexibleMinutes(mins)}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                        flexibleMinutes === mins
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ±{mins}m
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Default ±15 min overlap
                </p>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Only verified corporate colleagues travelling same route</span>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-700/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Finding Coworkers...
                  </>
                ) : (
                  <>
                    <span>Find My Pool</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Results View (Matches Screen) */
        <div className="space-y-6 animate-in fade-in">
          {/* Header Navigation & Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Smart Matches ✨
                </span>
                <span className="text-xs text-slate-500">
                  {travelDate} • {formatTime12Hour(departureTime)} (±{flexibleMinutes}m)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                {matchData && matchData.matches.length > 0
                  ? `We found ${matchData.matches.length} coworker(s) travelling your way!`
                  : 'No exact coworker matches found yet'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Route: {fromLocation?.shortName || 'UST Campus'} → {toLocation?.shortName || 'Trivandrum Central'}
              </p>
            </div>

            <button
              onClick={handleResetSearch}
              className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Adjust Route / Time
            </button>
          </div>

          {/* AI / Deterministic Insight Badge */}
          {matchData?.aiExplanation && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  ✨ Smart Pooling Insight
                </span>
                <p className="text-xs sm:text-sm text-slate-800 font-medium mt-1 leading-relaxed">
                  {matchData.aiExplanation}
                </p>
              </div>
            </div>
          )}

          {/* If Matches Exist: Prominent BEST MATCH Card */}
          {matchData && matchData.matches.length > 0 ? (
            <div className="space-y-6">
              {/* BEST MATCH CARD (Prompt Requirement 10) */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-500/80 overflow-hidden">
                <div className="bg-emerald-800 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-white uppercase tracking-wider">
                      BEST MATCH
                    </span>
                    <span className="text-xs font-semibold text-emerald-100">
                      Excellent Route Compatibility
                    </span>
                  </div>
                  <div className="text-xs font-bold text-emerald-200">
                    Suggested Departure: {formatTime12Hour(matchData.suggestedDepartureTime)}
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  {/* Route & Timing Overview */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase">Route</div>
                      <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                        <span>{fromLocation?.shortName || 'UST Campus'}</span>
                        <span className="text-slate-400">↓</span>
                        <span>{toLocation?.shortName || 'Trivandrum Central'}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Pickup: Main Gate Security, UST Campus
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-slate-400 uppercase">Suggested Departure</div>
                      <div className="text-2xl font-black text-emerald-700 mt-0.5">
                        {formatTime12Hour(matchData.suggestedDepartureTime)}
                      </div>
                      <div className="text-xs text-emerald-800 font-semibold">
                        Fits all riders within ±10 minutes
                      </div>
                    </div>
                  </div>

                  {/* Riders List (Prompt Requirement 10) */}
                  <div>
                    <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-3">
                      Compatible Coworkers ({1 + matchData.matches.length} Total Riders)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Current User */}
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {currentUser?.initials}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              {currentUser?.name}
                              <span className="text-[10px] font-bold text-emerald-800">(You)</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {formatTime12Hour(departureTime)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Matched Coworkers */}
                      {matchData.matches.slice(0, 2).map((match, idx) => (
                        <div key={match.trip._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {match.user.initials}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{match.user.name}</div>
                              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                <span>{formatTime12Hour(match.trip.departureTime)}</span>
                                <span className="text-[10px] text-emerald-700 font-bold">
                                  ({match.timeDifferenceMinutes === 0 ? 'Exact' : `±${match.timeDifferenceMinutes}m`})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fare & Savings Comparison Card */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Estimated Auto Fare</div>
                        <div className="text-2xl font-black text-white mt-1">₹{matchData.estimatedFare}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Route standard estimate</div>
                      </div>

                      <div className="sm:pl-4 pt-3 sm:pt-0">
                        <div className="text-xs text-slate-400 font-medium">
                          Split ({1 + matchData.matches.length} riders)
                        </div>
                        <div className="text-2xl font-black text-emerald-400 mt-1">
                          ₹{matchData.farePerPerson} <span className="text-xs font-normal text-slate-300">/ person</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Exact equal fare share</div>
                      </div>

                      <div className="sm:pl-4 pt-3 sm:pt-0">
                        <div className="text-xs text-emerald-400 font-medium">Estimated Savings</div>
                        <div className="text-2xl font-black text-emerald-300 mt-1">
                          ₹{matchData.savingPerPerson} <span className="text-xs font-normal text-slate-300">/ person</span>
                        </div>
                        <div className="text-[11px] text-emerald-400 font-bold mt-0.5">Save 66% vs solo ride</div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                      Joining coordinates all riders into a confirmed pool group.
                    </p>

                    <button
                      onClick={handleJoinOrCreatePool}
                      disabled={isJoining}
                      className="w-full sm:w-auto px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2"
                    >
                      {isJoining ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Confirming Pool...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          <span>Join / Create Pool</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Other Compatible Coworkers (if > 2 matches) */}
              {matchData.matches.length > 2 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-sm mb-3">
                    Other Coworkers Travelling Along This Route
                  </h3>
                  <div className="space-y-2">
                    {matchData.matches.slice(2).map(m => (
                      <div
                        key={m.trip._id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                            {m.user.initials}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900">{m.user.name}</span>
                            <div className="text-[11px] text-slate-500">
                              {m.user.department} • Prefers {formatTime12Hour(m.trip.departureTime)}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          {m.matchQuality} ({m.timeDifferenceMinutes}m diff)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State (Prompt Requirement 29) */
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
                <Car className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">No pool matches yet</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Your trip is posted! We will notify you and show compatible coworkers as soon as they schedule a ride
                along this route.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                {onOpenCreatePool && (
                  <button
                    onClick={onOpenCreatePool}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Pool as Host</span>
                  </button>
                )}

                <button
                  onClick={handleResetSearch}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Change Time or Route
                </button>

                <button
                  onClick={onNavigateToTrips}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                >
                  View My Trips
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
