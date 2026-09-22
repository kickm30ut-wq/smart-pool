import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import { api } from '../lib/api';
import { User } from '../types';
import { UserCheck, Shield, RefreshCw, X, Sparkles, Building, Briefcase } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, loginAs, refreshUsers } = useAuth();
  const { showToast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [filterRole, setFilterRole] = useState<'ALL' | 'EMPLOYEE' | 'ADMIN'>('ALL');

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    loginAs(user);
    showToast(`Switched account to ${user.name} (${user.role})`, 'success');
    onClose();
  };

  const handleResetData = async () => {
    try {
      setIsResetting(true);
      await api.resetDatabase();
      await refreshUsers();
      showToast('Database reset to clean demo scenario!', 'success');
    } catch {
      showToast('Failed to reset database', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filterRole === 'EMPLOYEE') return u.role === 'EMPLOYEE';
    if (filterRole === 'ADMIN') return u.role === 'ADMIN';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                SP
              </span>
              <h3 className="text-lg font-bold text-slate-900">Switch Demo Account</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select any pre-seeded enterprise employee or transport admin to test pooling scenarios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs & Quick Reset */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterRole('ALL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterRole === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => setFilterRole('EMPLOYEE')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterRole === 'EMPLOYEE' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Employees
            </button>
            <button
              onClick={() => setFilterRole('ADMIN')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterRole === 'ADMIN' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin Only
            </button>
          </div>

          <button
            onClick={handleResetData}
            disabled={isResetting}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors font-medium"
            title="Reset trips and pools to initial demo scenario"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-emerald-600' : ''}`} />
            Reset Demo Data
          </button>
        </div>

        {/* User List */}
        <div className="p-5 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100">
          {filteredUsers.map(user => {
            const isCurrent = currentUser?._id === user._id;
            const isAdmin = user.role === 'ADMIN';

            return (
              <div
                key={user._id}
                onClick={() => handleSelectUser(user)}
                className={`pt-2.5 first:pt-0 flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-emerald-50/80 border border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                      isAdmin
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : isCurrent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {user.initials || user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{user.name}</span>
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {user.employeeId}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        {user.department}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-lg">
                      <UserCheck className="w-3.5 h-3.5" /> Selected
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-600 px-3 py-1 rounded-lg border border-slate-200 hover:bg-white hover:border-slate-300">
                      Login →
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>
              Tip: Steven Paul, Arun Kumar, and Neha S demonstrate the Friday 6 PM Trivandrum Central match scenario.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
