import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/mockSupabase';
import {
  AdminDashboardStats,
  MaintenanceTask,
  TaskType,
  Asset,
  Grievance,
  Due,
  User,
} from '../../types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  MessageSquare,
  DollarSign,
  UserPlus,
  FileText,
  Send,
  Building,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  PhoneCall,
  Bell,
  RefreshCw,
  Settings,
  ChevronRight,
  Sliders,
  Users,
} from 'lucide-react';
import { AdminInviteModal } from './AdminInviteModal';
import { MonthlyReportExport } from './MonthlyReportExport';
import { ChatThreadModal } from '../chat/ChatThreadModal';
import { DueCollectionDetailModal } from './DueCollectionDetailModal';
import { MonthlyBudgetDetailModal } from './MonthlyBudgetDetailModal';
import { ProfileSettingsModal } from '../profile/ProfileSettingsModal';

interface AdminDashboardProps {
  currentUser: User | null;
  onNavigateToResident?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('10/2026');

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDueCollectionOpen, setIsDueCollectionOpen] = useState(false);
  const [isMonthlyBudgetOpen, setIsMonthlyBudgetOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [chatConfig, setChatConfig] = useState<{
    isOpen: boolean;
    type: 'grievance' | 'transaction';
    itemId: string;
    itemTitle: string;
  }>({
    isOpen: false,
    type: 'grievance',
    itemId: '',
    itemTitle: '',
  });

  // Action status feedbacks
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const unsub = supabase.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Financial Dashboard Stats (Phase 2 RPC)
      const { data: statsData } = await supabase.rpc('get_admin_dashboard_stats', {
        target_month_year: selectedPeriod,
      });
      setStats(statsData as AdminDashboardStats | null);

      // 2. Fetch Polymorphic Tasks (Phase 3 logic)
      const fetchedTasks = await fetchPolymorphicTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 3 Data Fetching & Strict Sorting Logic
  const fetchPolymorphicTasks = async (): Promise<MaintenanceTask[]> => {
    const today = '2026-10-05';
    const nextWeek = '2026-10-12'; // 7 days ahead

    // Priority 1: Assets with NextMaintenanceDate <= 7 days or past due
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .lte('next_maintenance_date', nextWeek);

    // Priority 2a: Grievances Open or Reopened
    const { data: grievances } = await supabase
      .from('grievances')
      .select('*, users(name), flats(flat_number)')
      .in('status', ['Open', 'Reopened']);

    // Priority 2b: Overdue Dues (Pending + past due date)
    const { data: dues } = await supabase
      .from('dues')
      .select('*, flats(flat_number)')
      .eq('status', 'Pending')
      .lt('due_date', today);

    // Normalize into unified MaintenanceTask interface
    const normalizedAssets: MaintenanceTask[] = (assets || []).map((a: Asset) => ({
      id: a.id,
      type: 'ASSET',
      title: `Maintenance: ${a.name}`,
      subtitle: `Vendor: ${a.vendor_name || 'In-house'} (${a.vendor_contact || 'No phone'})`,
      date: a.next_maintenance_date,
      priority: 1,
      metadata: a,
    }));

    const normalizedGrievances: MaintenanceTask[] = (grievances || []).map((g: Grievance) => ({
      id: g.id,
      type: 'GRIEVANCE',
      title: `Grievance: ${g.title}`,
      subtitle: `${g.user?.name || 'Resident'} · Flat ${g.flat?.flat_number || 'N/A'}: ${g.description.slice(0, 48)}...`,
      date: g.created_at,
      priority: 2,
      status: g.status,
      metadata: g,
    }));

    const normalizedDues: MaintenanceTask[] = (dues || []).map((d: Due) => ({
      id: d.id,
      type: 'DUE',
      title: `Overdue Dues: Flat ${d.flat?.flat_number || 'Unit'}`,
      subtitle: `Amount: $${d.amount} · Due date was ${d.due_date} (${d.notes || 'Pending clearance'})`,
      date: d.due_date,
      priority: 2,
      status: d.status,
      metadata: d,
    }));

    // SORTING LOGIC:
    // 1. Assets strictly appear at the top (Priority 1), sorted by closest deadline first
    // 2. Grievances and Overdue Dues mixed chronologically (oldest first)
    const allTasks = [...normalizedAssets, ...normalizedGrievances, ...normalizedDues];

    return allTasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  const handleAcknowledgeAsset = async (task: MaintenanceTask) => {
    // Extend maintenance date by 30 days for acknowledged asset
    const current = new Date(task.date);
    current.setDate(current.getDate() + 30);
    const newDate = current.toISOString().slice(0, 10);

    const state = supabase.getState();
    const asset = state.assets.find((a) => a.id === task.metadata.id);
    if (asset) {
      asset.next_maintenance_date = newDate;
      asset.last_serviced_date = '2026-10-05';
    }

    setActionFeedback(`Acknowledged! Next inspection scheduled for ${newDate}.`);
    setTimeout(() => setActionFeedback(null), 3500);
    loadData();
  };

  const handleSendReminder = (task: MaintenanceTask) => {
    const flatNum = task.metadata?.flat?.flat_number || 'Resident';
    const amount = task.metadata?.amount || 350;
    const msg = `Notice from Society Maintenance: Dear Flat ${flatNum} resident, your monthly maintenance fee of $${amount} is overdue. Please submit payment via the CivicNest app.`;
    navigator.clipboard.writeText(msg);

    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    setActionFeedback(`WhatsApp reminder opened & copied for Flat ${flatNum}!`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleOpenGrievanceThread = (task: MaintenanceTask) => {
    setChatConfig({
      isOpen: true,
      type: 'grievance',
      itemId: task.metadata.id,
      itemTitle: task.title,
    });
  };

  const collectionPercent = stats && stats.expected_dues > 0
    ? Math.min(100, Math.round((stats.collected_dues / stats.expected_dues) * 100))
    : 0;

  return (
    <div className="space-y-4 pb-20 text-slate-100">
      {/* Top Banner / Society Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">CivicNest Towers</h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                  Admin Command
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Welcome back, {currentUser?.name || 'Vikram Malhotra'} (Maintenance Lead)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Profile & Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadData()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="py-2 px-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Invite Flat Owner</span>
          </button>

          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="py-2 px-3 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Monthly Reports</span>
          </button>
        </div>
      </div>

      {/* Export Section (Phase 6 Toggle) */}
      {isExportOpen && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <MonthlyReportExport onClose={() => setIsExportOpen(false)} />
        </div>
      )}

      {/* Action Notification Toast */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Financial Command Center Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span>Financial Operations</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Period: {selectedPeriod}</span>
        </div>

        {/* Interactive Clickable Due Collection Status Card */}
        <div
          onClick={() => setIsDueCollectionOpen(true)}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 shadow-lg space-y-3 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-blue-300 transition-colors">
              Monthly Dues Collection
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-400 font-mono">
              <span>{collectionPercent}% Collected</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                ${stats ? stats.collected_dues.toLocaleString() : '0'}
              </span>
              <span className="text-xs text-slate-400">
                of ${stats ? stats.expected_dues.toLocaleString() : '0'} expected
              </span>
            </div>
            <span className="text-[11px] text-blue-400 font-medium underline underline-offset-2">
              View Detailed Ledger
            </span>
          </div>

          {/* Native Progress Bar */}
          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${collectionPercent}%` }}
            />
          </div>

          {/* Collection breakdown badges */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
            <div className="p-2 rounded-xl bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">Collected</span>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                ${stats ? stats.collected_dues : 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">In Verification</span>
              <span className="text-xs font-bold text-amber-400 tabular-nums">
                ${stats ? stats.under_verification_dues : 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">Overdue</span>
              <span className="text-xs font-bold text-rose-400 tabular-nums">
                ${stats ? stats.overdue_dues : 0}
              </span>
            </div>
          </div>

          {/* Click Callout */}
          <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-500/20 text-center text-xs text-blue-300 font-medium flex items-center justify-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Click to view detailed report of who paid & pending</span>
          </div>
        </div>

        {/* Overall Society Monthly Budget Component */}
        <div
          onClick={() => setIsMonthlyBudgetOpen(true)}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 shadow-lg space-y-3 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 group-hover:text-emerald-300 transition-colors">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Overall Society Monthly Budget</span>
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono">
              <span>{stats?.monthly_budget_percentage || 75}% Consumed</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                ${stats?.total_monthly_spent?.toLocaleString() || '5,600'}
              </span>
              <span className="text-xs text-slate-400">
                spent of ${stats?.total_monthly_budget?.toLocaleString() || '7,400'} cap
              </span>
            </div>

            <span className="text-xs text-emerald-400 font-medium underline underline-offset-2">
              Manage Monthly Budget
            </span>
          </div>

          {/* Progress bar for overall monthly budget */}
          <div className="space-y-1">
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (stats?.total_monthly_spent || 0) > (stats?.total_monthly_budget || 1)
                    ? 'bg-rose-500'
                    : (stats?.monthly_budget_percentage || 0) >= 85
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, stats?.monthly_budget_percentage || 75)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>Remaining Cushion: ${(stats?.monthly_budget_remaining || 1800).toLocaleString()}</span>
              <span>Month Elapsed: 19% (Day 6)</span>
            </div>
          </div>

          {/* Month Trend Mini Preview */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80 text-center text-[10px]">
            {stats?.monthly_history?.map((h, i) => (
              <div
                key={i}
                className={`p-1.5 rounded-lg border ${
                  h.month.includes('Current')
                    ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                    : 'bg-slate-800/40 border-slate-750 text-slate-400'
                }`}
              >
                <span className="font-semibold block truncate">{h.month.slice(0, 3)}</span>
                <span className="font-mono">${h.spent}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase 3: Actionable To-Do List (Polymorphic Task List) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Actionable To-Do List</span>
            </h3>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
              {tasks.length} active
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Asset &gt; Grievance &gt; Due</span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-200">All caught up!</p>
            <p className="text-xs text-slate-500 mt-0.5">
              No urgent asset inspections, unresolved grievances, or overdue payments.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task) => {
              const isAsset = task.type === 'ASSET';
              const isGrievance = task.type === 'GRIEVANCE';
              const isDue = task.type === 'DUE';

              const borderStyle = isAsset
                ? 'border-l-4 border-l-purple-500 bg-slate-900/90'
                : isGrievance
                ? 'border-l-4 border-l-amber-500 bg-slate-900/90'
                : 'border-l-4 border-l-rose-500 bg-slate-900/90';

              const badgeColor = isAsset
                ? 'text-purple-400 bg-purple-500/10'
                : isGrievance
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-rose-400 bg-rose-500/10';

              return (
                <div
                  key={`${task.type}-${task.id}`}
                  className={`p-3.5 rounded-xl border border-slate-800 ${borderStyle} shadow-md space-y-2.5 transition-all hover:border-slate-700`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${badgeColor}`}
                      >
                        {isAsset && <Wrench className="w-4 h-4" />}
                        {isGrievance && <AlertCircle className="w-4 h-4" />}
                        {isDue && <DollarSign className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isAsset
                                ? 'text-purple-400'
                                : isGrievance
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {isAsset ? 'Asset Maintenance' : isGrievance ? 'Resident Grievance' : 'Overdue Payment'}
                          </span>
                          <span className="text-slate-600 text-xs">·</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {task.date}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-100 truncate mt-0.5">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {task.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button as required by Phase 3 */}
                  <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500">
                      {isAsset ? 'Priority 1: Preventive' : 'Priority 2: Operational'}
                    </span>

                    {isAsset && (
                      <button
                        onClick={() => handleAcknowledgeAsset(task)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {isGrievance && (
                      <button
                        onClick={() => handleOpenGrievanceThread(task)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>View Thread</span>
                      </button>
                    )}

                    {isDue && (
                      <button
                        onClick={() => handleSendReminder(task)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reminder</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Due Collection Detailed Breakdown Modal (Click-through) */}
      <DueCollectionDetailModal
        isOpen={isDueCollectionOpen}
        onClose={() => setIsDueCollectionOpen(false)}
        currentUser={currentUser}
        onDataChanged={loadData}
      />

      {/* Monthly Budget Detail Modal (Over-the-month focus) */}
      <MonthlyBudgetDetailModal
        isOpen={isMonthlyBudgetOpen}
        onClose={() => setIsMonthlyBudgetOpen(false)}
        stats={stats}
        onDataChanged={loadData}
      />

      {/* Admin Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={() => loadData()}
      />

      {/* Admin Invite Modal */}
      <AdminInviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Chat Thread Modal */}
      <ChatThreadModal
        isOpen={chatConfig.isOpen}
        onClose={() => setChatConfig({ ...chatConfig, isOpen: false })}
        type={chatConfig.type}
        itemId={chatConfig.itemId}
        itemTitle={chatConfig.itemTitle}
        currentUser={currentUser}
      />
    </div>
  );
};
