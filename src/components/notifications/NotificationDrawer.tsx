import React, { useState, useEffect } from 'react';
import { Notification } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Bell, Check, Users, Car, CheckCheck, X } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPool?: (poolId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, onViewPool }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const data = await api.getNotifications(currentUser._id);
      setNotifications(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen, currentUser?._id]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await api.markAllNotificationsRead(currentUser._id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showToast('All notifications marked as read', 'info');
    } catch {
      showToast('Failed to mark notifications read', 'error');
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading updates...</div>
          ) : notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-700 text-sm">No notifications yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                You'll receive instant updates when coworkers match or join your pools.
              </p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif._id}
                onClick={() => {
                  if (!notif.read) handleMarkOneRead(notif._id);
                  if (notif.poolId && onViewPool) {
                    onViewPool(notif.poolId);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  notif.read
                    ? 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    : 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                }`}
              >
                {!notif.read && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      notif.type === 'POOL_JOIN'
                        ? 'bg-blue-100 text-blue-700'
                        : notif.type === 'POOL_FULL'
                        ? 'bg-purple-100 text-purple-700'
                        : notif.type === 'TRIP_MATCH'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {notif.type === 'POOL_JOIN' ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      <Car className="w-4 h-4" />
                    )}
                  </div>

                  <div className="pr-4">
                    <h5
                      className={`text-xs font-bold leading-snug ${
                        notif.read ? 'text-slate-800' : 'text-slate-900'
                      }`}
                    >
                      {notif.title}
                    </h5>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-slate-400">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {notif.poolId && (
                        <span className="text-[10px] font-semibold text-emerald-700 hover:underline">
                          View Pool →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
