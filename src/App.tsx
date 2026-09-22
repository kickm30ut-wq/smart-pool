import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { FindPoolView } from './components/trips/FindPoolView';
import { MyTripsView } from './components/trips/MyTripsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PoolDetailsModal } from './components/pools/PoolDetailsModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { LoginModal } from './components/LoginModal';

function AppContent() {
  const { currentUser, isLoading, activeRoleMode } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [findPoolPref, setFindPoolPref] = useState<{
    fromId?: string;
    toId?: string;
    date?: string;
    time?: string;
  }>({});

  const [activePoolId, setActivePoolId] = useState<string | null>(null);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  const handleOpenPoolDetails = (poolId: string) => {
    setActivePoolId(poolId);
    setIsPoolModalOpen(true);
  };

  const handleFindPoolFromDash = (pref?: {
    fromId?: string;
    toId?: string;
    date?: string;
    time?: string;
  }) => {
    if (pref) setFindPoolPref(pref);
    setCurrentTab('find-pool');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading Smart Pooling workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onNavigate={tab => setCurrentTab(tab)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'landing' ? (
          <LandingHero
            onGetStarted={() => setCurrentTab('dashboard')}
            onOpenDemoUsers={() => setIsUserModalOpen(true)}
          />
        ) : activeRoleMode === 'ADMIN' || currentTab.startsWith('admin-') ? (
          <AdminDashboard
            initialSubTab={
              currentTab === 'admin-locations'
                ? 'locations'
                : currentTab === 'admin-trips'
                ? 'trips'
                : currentTab === 'admin-analytics'
                ? 'analytics'
                : 'overview'
            }
            onViewPoolDetails={handleOpenPoolDetails}
          />
        ) : currentTab === 'find-pool' ? (
          <FindPoolView
            initialFromId={findPoolPref.fromId}
            initialToId={findPoolPref.toId}
            initialDate={findPoolPref.date}
            initialTime={findPoolPref.time}
            onPoolJoined={poolId => {
              handleOpenPoolDetails(poolId);
              setCurrentTab('dashboard');
            }}
            onNavigateToTrips={() => setCurrentTab('my-trips')}
          />
        ) : currentTab === 'my-trips' ? (
          <MyTripsView
            onViewPool={handleOpenPoolDetails}
            onFindPool={() => setCurrentTab('find-pool')}
          />
        ) : (
          <EmployeeDashboard
            onFindPool={handleFindPoolFromDash}
            onViewPool={handleOpenPoolDetails}
            onViewMyTrips={() => setCurrentTab('my-trips')}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <PoolDetailsModal
        poolId={activePoolId}
        isOpen={isPoolModalOpen}
        onClose={() => {
          setIsPoolModalOpen(false);
          setActivePoolId(null);
        }}
        onPoolUpdated={() => {
          // Trigger refresh if needed
        }}
      />

      <LoginModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onViewPool={handleOpenPoolDetails}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
