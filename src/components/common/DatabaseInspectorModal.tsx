import React, { useState } from 'react';
import { supabase } from '../../services/mockSupabase';
import { Database, Table, ShieldCheck, X, RefreshCw, Check, Code, FileSpreadsheet } from 'lucide-react';

interface DatabaseInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset?: () => void;
}

export const DatabaseInspectorModal: React.FC<DatabaseInspectorModalProps> = ({
  isOpen,
  onClose,
  onDataReset,
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'sql' | 'rls'>('tables');
  const [selectedTable, setSelectedTable] = useState<string>('dues');
  const [resetConfirm, setResetConfirm] = useState(false);

  if (!isOpen) return null;

  const state = supabase.getState();
  const tables = [
    { name: 'users', label: 'Users', count: state.users.length },
    { name: 'flats', label: 'Flats', count: state.flats.length },
    { name: 'dues', label: 'Dues', count: state.dues.length },
    { name: 'transactions', label: 'Transactions', count: state.transactions.length },
    { name: 'budgets', label: 'Budgets', count: state.budgets.length },
    { name: 'grievances', label: 'Grievances', count: state.grievances.length },
    { name: 'comments', label: 'Comments (Threads)', count: state.comments.length },
    { name: 'assets', label: 'Assets', count: state.assets.length },
    { name: 'announcements', label: 'Announcements', count: state.announcements.length },
  ];

  const currentTableData = (state as any)[selectedTable] || [];

  const handleReset = () => {
    supabase.resetToDefault();
    setResetConfirm(true);
    setTimeout(() => {
      setResetConfirm(false);
      if (onDataReset) onDataReset();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl h-[650px] max-h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Supabase PostgreSQL Architecture & State</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  Live Relational Store
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Inspect live tables, schemas, RLS policies, and RPC definitions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700/60"
              title="Reset Database to Pristine Sample State"
            >
              {resetConfirm ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Reset Complete</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Data</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="px-5 bg-slate-900 border-b border-slate-800 flex gap-4 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('tables')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'tables'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Live Data Tables ({tables.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>PostgreSQL Schema & RPCs</span>
          </button>
          <button
            onClick={() => setActiveTab('rls')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'rls'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Row-Level Security (RLS)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-hidden p-5">
          {activeTab === 'tables' && (
            <div className="flex flex-col sm:flex-row gap-4 h-full">
              {/* Tables list */}
              <div className="w-full sm:w-56 shrink-0 border border-slate-800 rounded-xl bg-slate-950/60 p-2 overflow-y-auto space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                  Public Tables:
                </span>
                {tables.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTable(t.name)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors ${
                      selectedTable === t.name
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        selectedTable === t.name
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Table Data Preview */}
              <div className="flex-1 border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden flex flex-col">
                <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 font-mono">
                    public.{selectedTable} ({currentTableData.length} records)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">JSON View</span>
                </div>
                <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(currentTableData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="h-full overflow-y-auto space-y-4 font-mono text-xs text-slate-300 pr-2">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-2">
                  -- 1. Complete Apartment Maintenance Schema
                </span>
                <pre className="text-[11px] leading-relaxed overflow-x-auto text-slate-300">
{`-- Users table (Supabase Auth link)
CREATE TABLE public.users (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  phone text unique not null,
  role text check (role in ('Maintenance', 'FlatOwner')) default 'FlatOwner',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Flats table
CREATE TABLE public.flats (
  id uuid default uuid_generate_v4() primary key,
  flat_number text not null,
  owner_id uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dues table (Phase 4 Payment Proof)
CREATE TABLE public.dues (
  id uuid default uuid_generate_v4() primary key,
  amount numeric(10,2) not null,
  due_date date not null,
  status text check (status in ('Pending', 'Paid', 'Under Verification', 'Overdue')),
  flat_id uuid references public.flats(id),
  payment_proof_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Transactions table
CREATE TABLE public.transactions (
  id uuid default uuid_generate_v4() primary key,
  amount numeric(10,2) not null,
  type text check (type in ('Credit', 'Debit')),
  category text not null,
  description text,
  flat_id uuid references public.flats(id),
  user_id uuid references public.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Budgets table
CREATE TABLE public.budgets (
  id uuid default uuid_generate_v4() primary key,
  category text not null,
  allocated_amount numeric(10,2) not null,
  month_year text not null
);

-- Assets table
CREATE TABLE public.assets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  next_maintenance_date date not null,
  last_serviced_date date,
  vendor_contact text
);

-- Comments & Grievance Threading (Phase 5)
CREATE TABLE public.comments (
  id uuid default uuid_generate_v4() primary key,
  text text not null,
  user_id uuid references public.users(id),
  transaction_id uuid references public.transactions(id),
  grievance_id uuid references public.comments(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-blue-400 font-bold block mb-2">
                  -- 2. PostgreSQL Functions / RPCs
                </span>
                <pre className="text-[11px] leading-relaxed overflow-x-auto text-slate-300">
{`-- Closed loop phone verification RPC (Phase 1)
CREATE OR REPLACE FUNCTION public.is_authorized_phone(phone_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE phone = phone_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Financial Command Center Aggregation RPC (Phase 2)
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(target_month_year TEXT)
RETURNS JSON AS $$
...
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'rls' && (
            <div className="h-full overflow-y-auto space-y-3 pr-2 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Row-Level Security (RLS) Policy Governance</span>
                </h4>
                <p className="text-slate-400 leading-relaxed text-xs">
                  Supabase Row Level Security is active on all tables. Policies isolate resident data while providing
                  elevated supervisory privileges to users with the <code className="text-blue-300">role = 'Maintenance'</code> claim.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-mono text-emerald-400 font-bold block">
                    Policy: "Users can view own profile"
                  </span>
                  <p className="text-slate-400 font-mono text-[11px]">
                    ON public.users FOR SELECT USING (auth.uid() = id);
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Residents can only retrieve their own credentials and phone profile.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-mono text-blue-400 font-bold block">
                    Policy: "Admins can insert new users"
                  </span>
                  <p className="text-slate-400 font-mono text-[11px]">
                    ON public.users FOR INSERT WITH CHECK (
                      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Maintenance')
                    );
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Strictly isolates the Admin Invite registration capability to Maintenance Owners.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-mono text-purple-400 font-bold block">
                    Policy: "Residents view only their flat dues"
                  </span>
                  <p className="text-slate-400 font-mono text-[11px]">
                    ON public.dues FOR SELECT USING (
                      EXISTS (SELECT 1 FROM public.flats WHERE flats.id = dues.flat_id AND flats.owner_id = auth.uid())
                      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'Maintenance'
                    );
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Ensures Sarah Jenkins cannot see David Chen's overdue payment ledger.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-mono text-amber-400 font-bold block">
                    Policy: "Polymorphic Thread Access"
                  </span>
                  <p className="text-slate-400 font-mono text-[11px]">
                    ON public.comments FOR SELECT USING (
                      user_id = auth.uid() OR
                      (SELECT role FROM public.users WHERE id = auth.uid()) = 'Maintenance'
                    );
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Realtime WhatsApp chat threads stay confidential between resident and society managers.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
