import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/mockSupabase';
import { Due, DueStatus, User, Flat } from '../../types';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Send,
  Eye,
  Filter,
  DollarSign,
  Download,
  Building,
  Check,
  MessageCircle,
  ExternalLink,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ChatThreadModal } from '../chat/ChatThreadModal';

interface DueCollectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onDataChanged?: () => void;
}

export const DueCollectionDetailModal: React.FC<DueCollectionDetailModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDataChanged,
}) => {
  if (!isOpen) return null;

  const [duesList, setDuesList] = useState<Due[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Chat thread modal integration
  const [chatConfig, setChatConfig] = useState<{
    isOpen: boolean;
    type: 'transaction' | 'grievance';
    itemId: string;
    itemTitle: string;
  }>({
    isOpen: false,
    type: 'transaction',
    itemId: '',
    itemTitle: '',
  });

  useEffect(() => {
    loadDues();
    const unsub = supabase.subscribe(() => {
      loadDues();
    });
    return () => unsub();
  }, []);

  const loadDues = () => {
    const state = supabase.getState();
    const enriched: Due[] = state.dues.map((d) => {
      const flat = state.flats.find((f) => f.id === d.flat_id);
      const user = flat ? state.users.find((u) => u.id === flat.owner_id) : undefined;
      return {
        ...d,
        flat,
        user,
      };
    });
    setDuesList(enriched);
  };

  // Aggregates
  const totalExpected = duesList.reduce((sum, d) => sum + d.amount, 0);
  const totalCollected = duesList.filter((d) => d.status === 'Paid').reduce((sum, d) => sum + d.amount, 0);
  const totalUnderVerification = duesList.filter((d) => d.status === 'Under Verification').reduce((sum, d) => sum + d.amount, 0);
  const totalOverdue = duesList.filter((d) => d.status === 'Overdue').reduce((sum, d) => sum + d.amount, 0);
  const totalPending = duesList.filter((d) => d.status === 'Pending').reduce((sum, d) => sum + d.amount, 0);

  const collectionPercent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Filter & Search
  const filteredDues = duesList.filter((d) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending_overdue'
        ? d.status === 'Pending' || d.status === 'Overdue'
        : d.status === filterStatus;

    const flatNum = d.flat?.flat_number?.toLowerCase() || '';
    const residentName = d.user?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch = !query || flatNum.includes(query) || residentName.includes(query);

    return matchesStatus && matchesSearch;
  });

  // Action: Approve & Mark Paid (for Under Verification or Pending)
  const handleApprovePayment = async (due: Due) => {
    const state = supabase.getState();
    const targetDue = state.dues.find((d) => d.id === due.id);
    if (!targetDue) return;

    targetDue.status = 'Paid';
    targetDue.updated_at = new Date().toISOString();
    targetDue.notes = `Payment verified and cleared by Admin ${currentUser?.name || 'Vikram'}`;

    // Add corresponding credit transaction
    state.transactions.push({
      id: `tx-col-${Date.now()}`,
      amount: due.amount,
      type: 'Credit',
      category: 'Maintenance Fee',
      description: `Maintenance Fee Cleared - Flat ${due.flat?.flat_number || 'Unit'} (${targetDue.notes})`,
      flat_id: due.flat_id,
      user_id: due.user?.id,
      created_at: new Date().toISOString(),
    });

    // Add audit comment
    state.comments.push({
      id: `c-ver-${Date.now()}`,
      text: `System: Payment of $${due.amount} verified and approved by Admin. Receipt reconciled.`,
      user_id: null,
      transaction_id: due.id,
      created_at: new Date().toISOString(),
    });

    setToastMessage(`Payment approved! Flat ${due.flat?.flat_number} marked as Paid.`);
    setTimeout(() => setToastMessage(null), 3500);

    loadDues();
    if (onDataChanged) onDataChanged();
  };

  // Action: Send WhatsApp reminder
  const handleSendReminder = (due: Due) => {
    const flatNum = due.flat?.flat_number || 'Resident';
    const residentName = due.user?.name || 'Resident';
    const amount = due.amount;
    const phone = due.user?.phone || '';
    const cleanDigits = phone.replace(/\D/g, '');

    const message = `Dear ${residentName} (Flat ${flatNum}), this is a friendly notification from CivicNest Maintenance. Your monthly maintenance due of $${amount} (Due date: ${due.due_date}) is pending. Please upload your payment receipt via the mobile app. Thank you!`;

    navigator.clipboard.writeText(message);
    const waUrl = cleanDigits
      ? `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');

    setToastMessage(`WhatsApp reminder copied & opened for ${residentName} (${flatNum})`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Export to Excel
  const handleExportDuesReport = () => {
    const rows = duesList.map((d) => ({
      'Flat Number': d.flat?.flat_number || 'N/A',
      'Block': d.flat?.block || 'N/A',
      'Resident Name': d.user?.name || 'Unassigned',
      'Phone': d.user?.phone || 'N/A',
      'Amount ($)': d.amount,
      'Due Date': d.due_date,
      'Status': d.status,
      'Proof Submitted': d.payment_proof_url ? 'Yes' : 'No',
      'Notes': d.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dues Status');
    XLSX.writeFile(wb, `CivicNest_Dues_Report_Oct2026.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl flex flex-col h-[700px] max-h-[94vh] shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Monthly Due Collection Ledger</h3>
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                  October 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed flat-by-flat audit report of paid, pending, and under-verification dues
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDuesReport}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Download Excel Spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial KPI Banner */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800/80 shrink-0 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total Expected</span>
              <span className="text-sm sm:text-base font-extrabold text-white tabular-nums">${totalExpected}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 block uppercase tracking-wider">Collected (Paid)</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-400 tabular-nums">${totalCollected}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30">
              <span className="text-[10px] text-amber-400 block uppercase tracking-wider">In Verification</span>
              <span className="text-sm sm:text-base font-extrabold text-amber-400 tabular-nums">${totalUnderVerification}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30">
              <span className="text-[10px] text-rose-400 block uppercase tracking-wider">Overdue</span>
              <span className="text-sm sm:text-base font-extrabold text-rose-400 tabular-nums">${totalOverdue}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30">
              <span className="text-[10px] text-blue-400 block uppercase tracking-wider">Collection Rate</span>
              <span className="text-sm sm:text-base font-extrabold text-blue-400 tabular-nums">{collectionPercent}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Collection Progress</span>
              <span className="font-mono text-blue-400 font-bold">{collectionPercent}% Completed</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${collectionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: 'all', label: `All (${duesList.length})` },
              { id: 'Paid', label: `Paid (${duesList.filter((d) => d.status === 'Paid').length})` },
              { id: 'Under Verification', label: `Verifying (${duesList.filter((d) => d.status === 'Under Verification').length})` },
              { id: 'Overdue', label: `Overdue (${duesList.filter((d) => d.status === 'Overdue').length})` },
              { id: 'Pending', label: `Pending (${duesList.filter((d) => d.status === 'Pending').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                  filterStatus === tab.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flat (A-101) or resident..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="mx-5 my-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Flat List Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredDues.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-1">
              <p className="text-sm font-semibold text-slate-400">No records found</p>
              <p className="text-xs">No dues match the selected filter status or search term.</p>
            </div>
          ) : (
            filteredDues.map((due) => {
              const isPaid = due.status === 'Paid';
              const isVerifying = due.status === 'Under Verification';
              const isOverdue = due.status === 'Overdue';
              const isPending = due.status === 'Pending';

              const statusBadgeClass = isPaid
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : isVerifying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : isOverdue
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

              return (
                <div
                  key={due.id}
                  className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl hover:border-slate-700/80 transition-all space-y-3 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/80 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Flat</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {due.flat?.flat_number || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{due.user?.name || 'Unassigned Flat'}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                            {due.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {due.user?.phone || 'No phone'} · {due.flat?.block || 'Block A'} (Floor {due.flat?.floor || 1})
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-lg font-extrabold text-white tabular-nums">${due.amount}</span>
                      <p className="text-[11px] text-slate-400 flex items-center sm:justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Due Date: {due.due_date}</span>
                      </p>
                    </div>
                  </div>

                  {/* Payment Note or Proof Thumbnail */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-850 text-xs">
                    <div className="text-slate-300 min-w-0 pr-2">
                      <span className="text-slate-500 mr-1.5 font-medium">Ledger Audit:</span>
                      <span className="text-slate-300">{due.notes || 'No remarks logged.'}</span>
                    </div>

                    {due.payment_proof_url && (
                      <button
                        type="button"
                        onClick={() => setSelectedProofUrl(due.payment_proof_url || null)}
                        className="py-1 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Proof Slip</span>
                      </button>
                    )}
                  </div>

                  {/* Contextual Management Actions */}
                  <div className="pt-2 border-t border-slate-850 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-mono">ID: #{due.id}</span>

                    <div className="flex items-center gap-2">
                      {/* For Under Verification: One-Click Approve */}
                      {isVerifying && (
                        <button
                          type="button"
                          onClick={() => handleApprovePayment(due)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify & Approve</span>
                        </button>
                      )}

                      {/* For Pending or Overdue: WhatsApp reminder & Manual Pay */}
                      {(isPending || isOverdue) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSendReminder(due)}
                            className="py-1.5 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp Reminder</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprovePayment(due)}
                            className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Manual Payment</span>
                          </button>
                        </>
                      )}

                      {/* Open Chat Thread */}
                      <button
                        type="button"
                        onClick={() =>
                          setChatConfig({
                            isOpen: true,
                            type: 'transaction',
                            itemId: due.id,
                            itemTitle: `Due #${due.id} - Flat ${due.flat?.flat_number} ($${due.amount})`,
                          })
                        }
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Open Discussion Thread"
                      >
                        <span>Chat Thread</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lightbox Receipt Proof Modal */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-4 shadow-2xl relative space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200">Attached Bank Receipt Slip</span>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 rounded-xl overflow-hidden p-2 flex items-center justify-center max-h-[70vh]">
              <img
                src={selectedProofUrl}
                alt="Payment slip"
                className="max-h-[60vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="text-center pt-1">
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

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
