import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/mockSupabase';
import { AdminDashboardStats, Transaction } from '../../types';
import {
  X,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Sliders,
  Save,
  Clock,
  Layers,
} from 'lucide-react';

interface MonthlyBudgetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: AdminDashboardStats | null;
  onDataChanged?: () => void;
}

export const MonthlyBudgetDetailModal: React.FC<MonthlyBudgetDetailModalProps> = ({
  isOpen,
  onClose,
  stats,
  onDataChanged,
}) => {
  if (!isOpen) return null;

  const [selectedMonth, setSelectedMonth] = useState('10/2026');
  const [totalBudgetInput, setTotalBudgetInput] = useState(
    stats?.total_monthly_budget?.toString() || '7400'
  );
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Debit Expense Outlay form
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Elevator AMC',
    amount: '',
    description: '',
  });

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, [selectedMonth]);

  const loadTransactions = () => {
    const state = supabase.getState();
    const debits = state.transactions
      .filter((t) => t.type === 'Debit')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecentTransactions(debits);
  };

  const handleUpdateMonthlyBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const newTotal = parseFloat(totalBudgetInput);
    if (isNaN(newTotal) || newTotal <= 0) return;

    const state = supabase.getState();
    // Distribute proportionally across current categories
    const currentSum = state.budgets.reduce((sum, b) => sum + b.allocated_amount, 0);
    const ratio = currentSum > 0 ? newTotal / currentSum : 1;

    state.budgets.forEach((b) => {
      b.allocated_amount = Math.round(b.allocated_amount * ratio);
    });

    setIsEditingBudget(false);
    setToastMessage(`Overall monthly budget cap updated to $${newTotal.toLocaleString()} for ${selectedMonth}!`);
    setTimeout(() => setToastMessage(null), 3500);

    if (onDataChanged) onDataChanged();
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expenseForm.amount);
    if (isNaN(amountVal) || amountVal <= 0 || !expenseForm.description.trim()) return;

    const state = supabase.getState();
    const newTx: Transaction = {
      id: `tx-deb-${Date.now()}`,
      amount: amountVal,
      type: 'Debit',
      category: expenseForm.category,
      description: expenseForm.description.trim(),
      created_at: new Date().toISOString(),
    };

    state.transactions.push(newTx);

    setIsAddingExpense(false);
    setExpenseForm({ category: 'Elevator AMC', amount: '', description: '' });
    setToastMessage(`Expense of $${amountVal.toLocaleString()} recorded under ${newTx.category}.`);
    setTimeout(() => setToastMessage(null), 3500);

    loadTransactions();
    if (onDataChanged) onDataChanged();
  };

  const totalAllocated = stats?.total_monthly_budget || 7400;
  const totalSpent = stats?.total_monthly_spent || 5600;
  const remaining = Math.max(0, totalAllocated - totalSpent);
  const percentageSpent = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  const isOver = totalSpent > totalAllocated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl flex flex-col h-[700px] max-h-[94vh] shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Society Monthly Budget Management</h3>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  October 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Overall monthly society expenditure control, burn rate, and financial runway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingExpense(true)}
              className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {toastMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Primary Overall Monthly KPI Card */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Overall Monthly Society Budget
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                    ${totalSpent.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-400">
                    of ${totalAllocated.toLocaleString()} allocated
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsEditingBudget(!isEditingBudget)}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700/80 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Adjust Ceiling</span>
              </button>
            </div>

            {/* Quick Edit Budget Input Form */}
            {isEditingBudget && (
              <form
                onSubmit={handleUpdateMonthlyBudget}
                className="p-3 bg-slate-950 border border-blue-500/30 rounded-2xl flex items-center gap-2 animate-in fade-in"
              >
                <div className="flex-1">
                  <label className="text-[11px] text-slate-400 block mb-1">Set New Monthly Budget Ceiling ($)</label>
                  <input
                    type="number"
                    value={totalBudgetInput}
                    onChange={(e) => setTotalBudgetInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 8000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="mt-4 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                >
                  Save Cap
                </button>
              </form>
            )}

            {/* Overall Monthly Burn Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">Monthly Burn Rate:</span>
                <span className={isOver ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {percentageSpent}% Consumed
                </span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver ? 'bg-rose-500' : percentageSpent >= 85 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, percentageSpent)}%` }}
                />
              </div>
            </div>

            {/* Three key pillars */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80 text-center">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-850">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Remaining Cushion</span>
                <span className={`text-base font-bold tabular-nums ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${remaining.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-850">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Month Elapsed</span>
                <span className="text-base font-bold text-white tabular-nums">19% (Day 6)</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-850">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Operating Health</span>
                <span className="text-base font-bold text-emerald-400">Stable</span>
              </div>
            </div>
          </div>

          {/* Month-over-Month Historical Performance Trend */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Month-over-Month Society Performance</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">4-Month Trend</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats?.monthly_history?.map((h, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl border text-left space-y-1 ${
                    h.month.includes('Current')
                      ? 'bg-blue-950/40 border-blue-500/40 ring-1 ring-blue-500/20'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-300 block">{h.month}</span>
                  <div className="text-xs text-slate-400">
                    Spent: <strong className="text-white">${h.spent.toLocaleString()}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">Cap: ${h.allocated.toLocaleString()}</div>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                      h.status === 'surplus'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : h.status === 'deficit'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {h.status === 'surplus' ? 'Surplus' : h.status === 'deficit' ? 'Over Budget' : 'On Track'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Breakdown by Category */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-3xl space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Category Contributions to Current Month Outlay</span>
            </span>

            <div className="space-y-2">
              {stats?.budget_health.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-slate-200 block truncate">{cat.category}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ${cat.spent_amount.toLocaleString()} / ${cat.allocated_amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        cat.is_over_budget ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {cat.percentage}%
                    </span>
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${
                          cat.is_over_budget ? 'bg-rose-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Outlays / Debits List */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-3xl space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Itemized Operational Outlays (Debits)</span>
            </span>

            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-white block truncate">{tx.description}</span>
                    <span className="text-[11px] text-slate-400">
                      {tx.category} · {tx.created_at.slice(0, 10)}
                    </span>
                  </div>
                  <span className="text-rose-400 font-bold font-mono text-sm shrink-0">
                    -${tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">Record Operational Expense</h4>
              <button onClick={() => setIsAddingExpense(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expense Description</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical treatment for water tank"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Elevator AMC">Elevator AMC</option>
                  <option value="Security Services">Security Services</option>
                  <option value="Generator Fuel & Power">Generator Fuel & Power</option>
                  <option value="Water Tank & Plumbing">Water Tank & Plumbing</option>
                  <option value="Landscaping & Gardening">Landscaping & Gardening</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 450"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  Record Outlay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
