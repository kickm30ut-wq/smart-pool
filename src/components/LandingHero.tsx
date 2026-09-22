import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Car,
  Users,
  BadgePercent,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  Building2,
} from 'lucide-react';

interface LandingHeroProps {
  onGetStarted: () => void;
  onOpenDemoUsers: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted, onOpenDemoUsers }) => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
        {/* Subtle geometric background accents */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-200/25 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>UST Hackathon Innovation MVP • Smart Ride Coordination</span>
            </div>

            {/* Main Brand Title & Tagline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Share the ride.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-600">
                Split the fare.
              </span>
            </h1>

            <p className="mt-5 text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
              Find coworkers heading your way from campus to common destinations around similar times.
              Form verified employee pools, coordinate auto and taxi rides, and reduce solo commute costs.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2"
              >
                <span>{currentUser ? 'Go to My Dashboard' : 'Get Started'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenDemoUsers}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Select Demo Employee</span>
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Deterministic matching engine • No actual taxi booking • Enterprise internal coordination
            </p>
          </div>

          {/* Visual Showcase Card: UST Campus -> Trivandrum Central Example */}
          <div className="mt-12 max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Live Enterprise Scenario
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Friday Evening Commute • UST Campus → Trivandrum Central
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold">
                <TrendingDown className="w-4 h-4" />
                <span>Save 66% per rider (₹120 savings)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              {/* Solo Journey */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase">Without Smart Pooling</div>
                <div className="text-lg font-bold text-slate-800 mt-1">3 Solo Auto Rides</div>
                <p className="text-xs text-slate-500 mt-1">
                  Steven, Arun, and Neha each hire separate autos at 5:50 PM, 6:00 PM, and 6:10 PM.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Total Spent:</span>
                  <span className="text-sm font-bold text-rose-600 line-through">₹540 (₹180 each)</span>
                </div>
              </div>

              {/* Smart Match */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 ring-2 ring-emerald-500/20 md:scale-105 z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Best Match
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    95% Match
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1">1 Coordinated Pool</div>
                <p className="text-xs text-slate-600 mt-1">
                  Departing at <span className="font-bold text-slate-900">6:00 PM</span> from UST Main Gate.
                  Riders: Steven (5:50), Arun (6:00), Neha (6:10).
                </p>
                <div className="mt-4 pt-3 border-t border-emerald-200 flex items-baseline justify-between">
                  <span className="text-xs text-slate-600 font-medium">Split Fare:</span>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-emerald-800">₹60 / person</span>
                    <div className="text-[10px] font-bold text-emerald-700">₹120 saved each!</div>
                  </div>
                </div>
              </div>

              {/* Sustainability Impact */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase">Enterprise Impact</div>
                <div className="text-lg font-bold text-slate-800 mt-1">Less Congestion</div>
                <p className="text-xs text-slate-500 mt-1">
                  Fewer vehicles at the security gate, reduced carbon footprint, and built-in coworker networking.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified employee badges only</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Principles Grid */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Verified Coworkers</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect exclusively with coworkers within your campus using registered employee IDs.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Flexible Departure Window</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Set a ±10 to ±30 minute window. Our deterministic engine detects overlapping trips automatically.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-3">
                <BadgePercent className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Transparent Fare Splitting</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                See estimated auto/taxi fares by route and your exact per-person share before hopping in.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Designated Campus Pickups</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Fixed pickup points like UST Main Gate or Phase II Food Court eliminate confusion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Smart Pooling</span>
            <span>•</span>
            <span>Enterprise Employee Commute Platform</span>
          </div>
          <div>Built for UST Hackathon • Next.js Full Stack Architecture</div>
        </div>
      </footer>
    </div>
  );
};
