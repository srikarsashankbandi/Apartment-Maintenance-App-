import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Wifi, Battery, Signal, Smartphone, Maximize2, Minimize2, Database, Users, LogOut, Check } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  onOpenDbInspector: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  currentUser,
  onSwitchUser,
  onLogout,
  onOpenDbInspector,
  isExpanded,
  onToggleExpanded,
}) => {
  const [currentTime, setCurrentTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Universal Control Strip */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
              CivicNest Mobile
            </span>
          </div>

          <span className="hidden md:inline-block text-xs text-slate-400 font-medium border-l border-slate-700 pl-3">
            Expo · TypeScript · Supabase Engine
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Role / User Dropdown Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
            <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-400 hidden sm:inline text-[11px]">Role:</span>
            <select
              value={currentUser ? currentUser.id : 'logged-out'}
              onChange={(e) => {
                if (e.target.value === 'logged-out') {
                  onLogout();
                } else {
                  onSwitchUser(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value="user-admin-1" className="bg-slate-900 text-slate-100">
                Vikram (Maintenance Admin)
              </option>
              <option value="user-resident-1" className="bg-slate-900 text-slate-100">
                Sarah Jenkins (Resident A-101)
              </option>
              <option value="user-resident-2" className="bg-slate-900 text-slate-100">
                David Chen (Resident B-204 · Overdue)
              </option>
              <option value="user-resident-3" className="bg-slate-900 text-slate-100">
                Priya Sharma (Resident C-302)
              </option>
              <option value="logged-out" className="bg-slate-900 text-slate-100">
                -- Phase 1 Login / OTP Screen --
              </option>
            </select>
          </div>

          {/* Database Inspector trigger */}
          <button
            onClick={onOpenDbInspector}
            className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700/80"
            title="Inspect Supabase PostgreSQL schema and tables"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">DB Inspector</span>
          </button>

          {/* Mobile frame toggle */}
          <button
            onClick={onToggleExpanded}
            className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700/80"
            title={isExpanded ? 'Switch to Phone Frame' : 'Switch to Full Width'}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Phone Frame</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Full Screen</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 w-full flex items-center justify-center p-0 sm:p-6 overflow-y-auto">
        {isExpanded ? (
          /* Full Expanded Responsive View */
          <div className="w-full max-w-2xl bg-slate-900 min-h-[85vh] rounded-none sm:rounded-3xl border-0 sm:border border-slate-800 shadow-2xl p-4 sm:p-6 my-auto">
            {children}
          </div>
        ) : (
          /* High-Fidelity Mobile Phone Simulator */
          <div className="relative w-full max-w-[400px] h-[844px] max-h-[94vh] bg-slate-950 rounded-[44px] border-[10px] border-slate-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col overflow-hidden my-auto ring-1 ring-slate-800">
            {/* Phone Top Notch / Dynamic Island */}
            <div className="absolute top-0 left-0 right-0 h-10 px-7 flex items-center justify-between text-xs text-slate-200 z-50 pointer-events-none select-none bg-slate-950/80 backdrop-blur-md">
              <span className="font-semibold text-[13px] tracking-tight pl-1">{currentTime}</span>

              {/* Dynamic Island pill */}
              <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end px-2 border border-slate-850">
                <span className="w-2 h-2 rounded-full bg-blue-500/80 mr-1 animate-pulse" />
              </div>

              {/* Icons: Signal, Wifi, Battery */}
              <div className="flex items-center gap-1.5 pr-1 text-slate-300">
                <Signal className="w-3.5 h-3.5" />
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Scrollable Content inside Phone */}
            <div className="flex-1 overflow-y-auto pt-10 px-3.5 sm:px-4 bg-slate-950">
              {children}
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="h-5 w-full bg-slate-950 flex items-center justify-center shrink-0 pb-1 pointer-events-none select-none">
              <div className="w-32 h-1 bg-slate-600/70 rounded-full" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
