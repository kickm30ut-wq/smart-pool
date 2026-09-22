import React, { useState, useEffect } from 'react';
import { Location, Pool } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { getEstimatedFare, calculateFarePerPerson, calculateSavingsPerPerson } from '../../lib/fare';
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  Users,
  X,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  Check,
  Navigation,
} from 'lucide-react';

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPoolCreated: (poolId: string) => void;
  initialFromId?: string;
  initialToId?: string;
  initialDate?: string;
  initialTime?: string;
}

export const CreatePoolModal: React.FC<CreatePoolModalProps> = ({
  isOpen,
  onClose,
  onPoolCreated,
  initialFromId,
  initialToId,
  initialDate,
  initialTime,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [fromLocationId, setFromLocationId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');
  const [travelDate, setTravelDate] = useState<string>('2026-09-25');
  const [departureTime, setDepartureTime] = useState<string>('18:00');
  const [pickupPoint, setPickupPoint] = useState<string>('');
  const [maxPassengers, setMaxPassengers] = useState<number>(4);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadLocations = async () => {
      try {
        const locs = await api.getLocations(true);
        setLocations(locs);

        if (initialFromId) {
          setFromLocationId(initialFromId);
        } else if (locs.length > 0) {
          const ust = locs.find(l => l.name.includes('UST')) || locs[0];
          setFromLocationId(ust._id);
        }

        if (initialToId) {
          setToLocationId(initialToId);
        } else if (locs.length > 1) {
          const tvc = locs.find(l => l.name.includes('Central') || l.name.includes('Railway')) || locs[1];
          setToLocationId(tvc._id);
        }

        if (initialDate) setTravelDate(initialDate);
        if (initialTime) setDepartureTime(initialTime);
      } catch {
        showToast('Failed to load campus locations', 'error');
      }
    };

    loadLocations();
  }, [isOpen, initialFromId, initialToId, initialDate, initialTime]);

  // Update default pickup point when fromLocation changes
  useEffect(() => {
    const fromLoc = locations.find(l => l._id === fromLocationId);
    if (fromLoc) {
      setPickupPoint(fromLoc.landmark || `${fromLoc.shortName} Main Security Gate`);
    }
  }, [fromLocationId, locations]);

  if (!isOpen) return null;

  const fromLocation = locations.find(l => l._id === fromLocationId);
  const toLocation = locations.find(l => l._id === toLocationId);
  const estimatedFare = fromLocation && toLocation ? getEstimatedFare(fromLocation.name, toLocation.name) : 150;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please login to create a pool', 'error');
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

    try {
      setIsSubmitting(true);
      const newPool = await api.createPool({
        userId: currentUser._id,
        fromLocationId,
        toLocationId,
        travelDate,
        suggestedDepartureTime: departureTime,
        pickupPoint: pickupPoint.trim() || `${fromLocation?.shortName || 'Campus'} Pickup Point`,
        maxPassengers,
        estimatedFare,
      });

      showToast('Ride pool created successfully! Coworkers can now discover and join.', 'success');
      onClose();
      onPoolCreated(newPool._id);
    } catch (err: any) {
      showToast(err.message || 'Failed to create ride pool', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" /> Start a Commute Pool
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Create a New Ride Pool</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Host a ride for coworkers heading your way. They can book open seats and split the fare.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Host Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {currentUser?.initials || 'ME'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{currentUser?.name} (You)</p>
                <p className="text-[11px] text-slate-500">{currentUser?.department} • Pool Host</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
              1 Seat Reserved
            </span>
          </div>

          {/* Route: From & To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                From (Pickup Campus)
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
                To (Destination)
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

          {/* Date & Time */}
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

          {/* Pickup Landmark */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pickup Point / Landmark
            </label>
            <div className="relative">
              <Navigation className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={pickupPoint}
                onChange={e => setPickupPoint(e.target.value)}
                placeholder="e.g. Main Gate Security Gate 1, UST Campus"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            {fromLocation?.landmark && (
              <button
                type="button"
                onClick={() => setPickupPoint(fromLocation.landmark || '')}
                className="mt-1 text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
              >
                Use campus landmark: &ldquo;{fromLocation.landmark}&rdquo;
              </button>
            )}
          </div>

          {/* Ride Type & Capacity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Vehicle Capacity (Max Riders)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMaxPassengers(3)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  maxPassengers === 3
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Auto Rickshaw</div>
                  <div className="text-[11px] text-slate-500">3 passengers max</div>
                </div>
                {maxPassengers === 3 && <Check className="w-4 h-4 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setMaxPassengers(4)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  maxPassengers === 4
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Taxi / Cab</div>
                  <div className="text-[11px] text-slate-500">4 passengers max</div>
                </div>
                {maxPassengers === 4 && <Check className="w-4 h-4 text-emerald-600" />}
              </button>
            </div>
          </div>

          {/* Fare Split Preview */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" /> Estimated Fare & Split
              </span>
              <span className="text-xs font-extrabold text-slate-900">Total: ₹{estimatedFare}</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 font-semibold">1 Rider (You)</div>
                <div className="font-bold text-slate-900 mt-0.5">₹{estimatedFare}</div>
                <div className="text-[9px] text-slate-400">solo</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 font-semibold">2 Riders</div>
                <div className="font-bold text-emerald-700 mt-0.5">₹{calculateFarePerPerson(estimatedFare, 2)}</div>
                <div className="text-[9px] text-emerald-600 font-bold">Save 50%</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 font-semibold">3 Riders</div>
                <div className="font-bold text-emerald-700 mt-0.5">₹{calculateFarePerPerson(estimatedFare, 3)}</div>
                <div className="text-[9px] text-emerald-600 font-bold">Save 67%</div>
              </div>
              {maxPassengers === 4 && (
                <div className="p-2 rounded-lg bg-emerald-100/60 border border-emerald-300">
                  <div className="text-[10px] text-emerald-800 font-semibold">Full (4 Riders)</div>
                  <div className="font-bold text-emerald-900 mt-0.5">₹{calculateFarePerPerson(estimatedFare, 4)}</div>
                  <div className="text-[9px] text-emerald-700 font-bold">Save 75%</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Car className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Pool...' : 'Publish Pool'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
