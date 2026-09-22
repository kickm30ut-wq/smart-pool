import React, { useState, useEffect } from 'react';
import { Pool, User } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { formatTime12Hour } from '../../lib/matching';
import {
  Car,
  MapPin,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  X,
  Share2,
  AlertCircle,
  PhoneCall,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface PoolDetailsModalProps {
  poolId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPoolUpdated?: () => void;
}

export const PoolDetailsModal: React.FC<PoolDetailsModalProps> = ({
  poolId,
  isOpen,
  onClose,
  onPoolUpdated,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPool = async () => {
    if (!poolId) return;
    try {
      setLoading(true);
      const data = await api.getPool(poolId);
      setPool(data);
    } catch (err) {
      showToast('Failed to load pool details', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && poolId) {
      fetchPool();
    }
  }, [isOpen, poolId]);

  if (!isOpen || !poolId) return null;

  const isMember = currentUser ? pool?.memberIds.includes(currentUser._id) : false;
  const isCreator = currentUser ? pool?.createdBy === currentUser._id : false;
  const memberCount = pool?.memberIds.length || 1;
  const maxPassengers = pool?.maxPassengers || 4;
  const estimatedFare = pool?.estimatedFare || 180;
  const farePerPerson = Math.round(estimatedFare / memberCount);
  const savingPerPerson = Math.max(0, estimatedFare - farePerPerson);

  const handleLeavePool = async () => {
    if (!currentUser || !pool) return;
    if (!confirm('Are you sure you want to leave this pool? A seat will be released to other coworkers.')) {
      return;
    }
    try {
      setIsProcessing(true);
      await api.leavePool(pool._id, currentUser._id);
      showToast('You have successfully left the pool', 'info');
      if (onPoolUpdated) onPoolUpdated();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to leave pool', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!pool) return;
    try {
      setIsProcessing(true);
      await api.updatePool(pool._id, { status: 'COMPLETED' });
      showToast('Ride marked as completed! Great job pooling.', 'success');
      await fetchPool();
      if (onPoolUpdated) onPoolUpdated();
    } catch {
      showToast('Failed to mark trip as completed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with gradient & status */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              <Car className="w-3.5 h-3.5" />
              {pool?.status === 'COMPLETED' ? 'Completed Ride' : '🚕 Pool Confirmed'}
            </span>
            <span className="text-xs text-emerald-100 font-medium">
              {pool?.memberIds.length} of {maxPassengers} seats filled
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {pool?.fromLocation?.shortName || 'UST Campus'} → {pool?.toLocation?.shortName || 'Trivandrum Central'}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-emerald-100 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {pool?.travelDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatTime12Hour(pool?.suggestedDepartureTime || '18:00')}
            </span>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading pool details...</div>
          ) : !pool ? (
            <div className="py-12 text-center text-slate-400 text-sm">Pool not found</div>
          ) : (
            <>
              {/* Pickup Point Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-slate-500">Designated Pickup Point</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {pool.pickupPoint || 'Main Gate, UST Campus'}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pool.fromLocation?.landmark || 'Assemble 5 minutes before departure.'}
                  </p>
                </div>
              </div>

              {/* Riders Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Riders ({pool.members?.length || pool.memberIds.length} of {maxPassengers})
                  </h4>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {maxPassengers - (pool.memberIds.length || 0)} open seat(s)
                  </span>
                </div>

                <div className="space-y-2.5">
                  {pool.members?.map((member, index) => {
                    const isYou = currentUser?._id === member._id;
                    const isPoolCreator = pool.createdBy === member._id;

                    return (
                      <div
                        key={member._id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          isYou
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isYou
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {member.initials || member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-900">{member.name}</span>
                              {isYou && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">
                                  You
                                </span>
                              )}
                              {isPoolCreator && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  Pool Lead
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {member.department} • {member.employeeId}
                            </div>
                          </div>
                        </div>

                        {member.phone && (
                          <a
                            href={`tel:${member.phone}`}
                            className="p-2 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition-colors"
                            title={`Call ${member.name}`}
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fare & Savings Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div>
                    <span className="text-xs font-semibold text-slate-400">Estimated Auto Fare</span>
                    <div className="text-xl font-bold text-white">₹{estimatedFare}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400">Riders Splitting</span>
                    <div className="text-xl font-bold text-emerald-400">{memberCount}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                    <span className="text-[11px] font-medium text-slate-400">Your Share</span>
                    <div className="text-2xl font-black text-white mt-0.5">₹{farePerPerson}</div>
                    <span className="text-[10px] text-slate-400">Exact split</span>
                  </div>

                  <div className="bg-emerald-950/80 p-3 rounded-xl border border-emerald-800/80">
                    <span className="text-[11px] font-semibold text-emerald-300">Estimated Saving</span>
                    <div className="text-2xl font-black text-emerald-400 mt-0.5">₹{savingPerPerson}</div>
                    <span className="text-[10px] text-emerald-300">vs solo taxi</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-4 leading-relaxed italic">
                  Fare is an estimate. Final amount can be updated by the group directly with the auto/cab driver.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {pool && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {isMember && pool.status !== 'COMPLETED' ? (
              <>
                <button
                  onClick={handleLeavePool}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Leave Pool
                </button>

                <button
                  onClick={handleMarkCompleted}
                  disabled={isProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Trip Completed
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
              >
                Close Details
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
