import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Car,
  Bell,
  User as UserIcon,
  Shield,
  ChevronDown,
  LogOut,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  Menu,
  X,
  Compass,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenUserModal: () => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenUserModal,
  onOpenNotifications,
}) => {
  const { currentUser, logout, isAdmin, activeRoleMode, switchRoleMode } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const fetchUnread = async () => {
      try {
        const notifs = await api.getNotifications(currentUser._id);
        setUnreadNotifs(notifs.filter(n => !n.read).length);
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-3 text-left focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">
                    Smart Pooling
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Enterprise
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Share the ride. Split the fare.
                </p>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-slate-200 text-sm font-semibold">
              {activeRoleMode === 'EMPLOYEE' ? (
                <>
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className={`px-3.5 py-2 rounded-lg transition-colors ${
                      currentTab === 'dashboard'
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => onNavigate('find-pool')}
                    className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentTab === 'find-pool'
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-emerald-600" />
                    Find Pool
                  </button>
                  <button
                    onClick={() => onNavigate('my-trips')}
                    className={`px-3.5 py-2 rounded-lg transition-colors ${
                      currentTab === 'my-trips'
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    My Trips
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate('admin-dashboard')}
                    className={`px-3.5 py-2 rounded-lg transition-colors ${
                      currentTab === 'admin-dashboard'
                        ? 'bg-purple-50 text-purple-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Admin Dashboard
                  </button>
                  <button
                    onClick={() => onNavigate('admin-locations')}
                    className={`px-3.5 py-2 rounded-lg transition-colors ${
                      currentTab === 'admin-locations'
                        ? 'bg-purple-50 text-purple-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Locations
                  </button>
                  <button
                    onClick={() => onNavigate('admin-trips')}
                    className={`px-3.5 py-2 rounded-lg transition-colors ${
                      currentTab === 'admin-trips'
                        ? 'bg-purple-50 text-purple-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Trips & Pools
                  </button>
                  <button
                    onClick={() => onNavigate('admin-analytics')}
                    className={`px-3.5 py-2 rounded-lg transition-colors ${
                      currentTab === 'admin-analytics'
                        ? 'bg-purple-50 text-purple-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Demand Analytics
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Right Action Icons & User Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Role Mode Switcher (Employee <-> Admin) */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => {
                  switchRoleMode('EMPLOYEE');
                  if (currentTab.startsWith('admin-')) onNavigate('dashboard');
                }}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  activeRoleMode === 'EMPLOYEE'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Employee
              </button>
              <button
                onClick={() => {
                  switchRoleMode('ADMIN');
                  onNavigate('admin-dashboard');
                }}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all ${
                  activeRoleMode === 'ADMIN'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3 h-3" />
                Admin
              </button>
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {/* User Pill & Quick Switcher */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {currentUser.initials}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {currentUser.role === 'ADMIN' ? 'Transport Admin' : currentUser.employeeId}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {currentUser.department}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenUserModal();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      Switch Demo User
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('landing');
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      About Smart Pooling
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        onNavigate('landing');
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500">Switch Role Mode:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => {
                  switchRoleMode('EMPLOYEE');
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1 rounded-md ${
                  activeRoleMode === 'EMPLOYEE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Employee
              </button>
              <button
                onClick={() => {
                  switchRoleMode('ADMIN');
                  onNavigate('admin-dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1 rounded-md ${
                  activeRoleMode === 'ADMIN' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          {activeRoleMode === 'EMPLOYEE' ? (
            <>
              <button
                onClick={() => {
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  onNavigate('find-pool');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Find Pool
              </button>
              <button
                onClick={() => {
                  onNavigate('my-trips');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                My Trips
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  onNavigate('admin-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Admin Dashboard
              </button>
              <button
                onClick={() => {
                  onNavigate('admin-locations');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Locations
              </button>
              <button
                onClick={() => {
                  onNavigate('admin-trips');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Trips & Pools
              </button>
              <button
                onClick={() => {
                  onNavigate('admin-analytics');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Demand Analytics
              </button>
            </>
          )}

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenUserModal();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50"
            >
              Switch Demo User ({currentUser?.name})
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
