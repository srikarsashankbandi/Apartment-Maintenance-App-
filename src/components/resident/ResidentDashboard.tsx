import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/mockSupabase';
import { Due, Announcement, Grievance, User, Flat } from '../../types';
import {
  Home,
  Receipt,
  Bell,
  MessageSquare,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Building2,
  ChevronRight,
  Plus,
  X,
  CreditCard,
  Eye,
  Send,
  User as UserIcon,
  Settings,
  Car,
  Mail,
  Phone,
  PhoneCall,
} from 'lucide-react';
import { ChatThreadModal } from '../chat/ChatThreadModal';
import { ProfileSettingsModal } from '../profile/ProfileSettingsModal';

interface ResidentDashboardProps {
  currentUser: User | null;
}

export const ResidentDashboard: React.FC<ResidentDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'dues' | 'notices' | 'grievances' | 'profile'>('overview');
  const [loading, setLoading] = useState(true);
  const [userFlat, setUserFlat] = useState<Flat | null>(null);
  const [dues, setDues] = useState<Due[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Receipt Upload State
  const [selectedDueForPayment, setSelectedDueForPayment] = useState<Due | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);

  // New Grievance State
  const [isNewGrievanceOpen, setIsNewGrievanceOpen] = useState(false);
  const [grievanceForm, setGrievanceForm] = useState({
    title: '',
    description: '',
    category: 'Plumbing',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
  });

  // Chat Thread Modal State
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

  useEffect(() => {
    loadResidentData();
    const unsub = supabase.subscribe(() => {
      loadResidentData();
    });
    return () => unsub();
  }, [currentUser]);

  const loadResidentData = async () => {
    if (!currentUser) return;
    setLoading(false);

    const state = supabase.getState();

    // 1. Find user flat
    const flat = state.flats.find((f) => f.owner_id === currentUser.id) || null;
    setUserFlat(flat);

    // 2. Fetch dues for this flat
    if (flat) {
      const userDues = state.dues
        .filter((d) => d.flat_id === flat.id)
        .map((d) => ({
          ...d,
          flat,
        }))
        .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
      setDues(userDues);
    } else {
      setDues([]);
    }

    // 3. Announcements
    const notices = [...state.announcements].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setAnnouncements(notices);

    // 4. Grievances filed by this resident
    const myGrievances = state.grievances
      .filter((g) => g.user_id === currentUser.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setGrievances(myGrievances);
  };

  const markNoticeAsRead = (noticeId: string) => {
    if (!currentUser) return;
    const state = supabase.getState();
    const notice = state.announcements.find((a) => a.id === noticeId);
    if (notice) {
      if (!notice.read_by) notice.read_by = [];
      if (!notice.read_by.includes(currentUser.id)) {
        notice.read_by.push(currentUser.id);
      }
    }
    loadResidentData();
  };

  const handleSelectSampleReceipt = (type: 'bank' | 'upi' | 'cheque') => {
    // Generate realistic base64 or mockup receipt image representation
    const sampleReceipts = {
      bank: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      upi: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400',
      cheque: 'https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?w=400',
    };
    setReceiptPreview(sampleReceipts[type]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmSubmitReceipt = async () => {
    if (!selectedDueForPayment || !receiptPreview || !currentUser) return;

    setUploading(true);

    try {
      const fileName = `receipts/${selectedDueForPayment.id}_${Date.now()}.jpg`;

      // 1. Upload to Supabase Storage
      await supabase.storage.from('payments').upload(fileName, receiptPreview);

      // 2. Update Due status and URL in database
      const state = supabase.getState();
      const targetDue = state.dues.find((d) => d.id === selectedDueForPayment.id);
      if (targetDue) {
        targetDue.status = 'Under Verification';
        targetDue.payment_proof_url = fileName;
        targetDue.updated_at = new Date().toISOString();
        targetDue.notes = 'Receipt uploaded by resident. Awaiting maintenance verification.';
      }

      // 3. Create System Comment in chat thread audit
      await supabase.from('comments').insert([
        {
          text: `System: Receipt uploaded by ${currentUser.name} for Due #${selectedDueForPayment.id} ($${selectedDueForPayment.amount})`,
          user_id: null,
          transaction_id: selectedDueForPayment.id,
          created_at: new Date().toISOString(),
        },
      ]);

      setUploadSuccessToast(
        `Receipt successfully submitted for Flat ${userFlat?.flat_number}! Status updated to 'Under Verification'.`
      );
      setTimeout(() => setUploadSuccessToast(null), 4000);

      setSelectedDueForPayment(null);
      setReceiptPreview(null);
      loadResidentData();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !grievanceForm.title.trim()) return;

    const newGrievance: Grievance = {
      id: `g-${Date.now()}`,
      title: grievanceForm.title.trim(),
      description: grievanceForm.description.trim(),
      category: grievanceForm.category,
      priority: grievanceForm.priority,
      status: 'Open',
      user_id: currentUser.id,
      flat_id: userFlat?.id,
      created_at: new Date().toISOString(),
    };

    const state = supabase.getState();
    state.grievances.push(newGrievance);

    // Initial system comment
    state.comments.push({
      id: `c-${Date.now()}`,
      text: `System: Grievance registered by ${currentUser.name} (Flat ${userFlat?.flat_number || 'N/A'})`,
      user_id: null,
      grievance_id: newGrievance.id,
      created_at: new Date().toISOString(),
    });

    setIsNewGrievanceOpen(false);
    setGrievanceForm({
      title: '',
      description: '',
      category: 'Plumbing',
      priority: 'Medium',
    });
    loadResidentData();
  };

  const pendingDuesTotal = dues
    .filter((d) => d.status === 'Pending' || d.status === 'Overdue')
    .reduce((sum, d) => sum + d.amount, 0);

  const unreadAnnouncements = announcements.filter(
    (a) => !a.read_by || !a.read_by.includes(currentUser?.id || '')
  );

  return (
    <div className="flex flex-col min-h-full pb-20 text-slate-100">
      {/* Toast Notification */}
      {uploadSuccessToast && (
        <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{uploadSuccessToast}</span>
        </div>
      )}

      {/* Main Tab Content Area */}
      <div className="flex-1 space-y-4">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Resident Welcome & Flat Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                      Welcome Home
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {currentUser?.parking_slot || userFlat?.parking_slot || 'Slot P-A12'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                    {currentUser?.name || 'Resident'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Flat {userFlat?.flat_number || 'A-101'} · {userFlat?.block || 'Block A'} (Floor{' '}
                    {userFlat?.floor || 1})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Profile Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base">
                    {userFlat?.flat_number || 'A1'}
                  </div>
                </div>
              </div>

              {/* Outstanding Dues Callout */}
              <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">Current Outstanding Dues:</span>
                  <p className="text-lg font-extrabold text-white tabular-nums">
                    ${pendingDuesTotal}
                  </p>
                </div>
                {pendingDuesTotal > 0 ? (
                  <button
                    onClick={() => setActiveTab('dues')}
                    className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Pay Dues</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dues Cleared</span>
                  </span>
                )}
              </div>
            </div>

            {/* Unopened Announcements (Prioritized at top per Phase 4 specs) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Prioritized Announcements
                  </h3>
                </div>
                {unreadAnnouncements.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                    {unreadAnnouncements.length} Unread
                  </span>
                )}
              </div>

              {unreadAnnouncements.length === 0 ? (
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
                  <span>You are up to date on all society announcements.</span>
                  <button
                    onClick={() => setActiveTab('notices')}
                    className="text-blue-400 hover:underline text-[11px]"
                  >
                    View Archive
                  </button>
                </div>
              ) : (
                unreadAnnouncements.map((notice) => (
                  <div
                    key={notice.id}
                    className="p-3.5 bg-slate-900 border border-amber-500/30 rounded-xl space-y-2 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-100">{notice.title}</h4>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold uppercase px-1.5 py-0.5 bg-amber-500/10 rounded">
                        {notice.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-4">{notice.content}</p>
                    <div className="flex items-center justify-between pt-1 pl-4 text-[11px] text-slate-500">
                      <span>Posted {notice.created_at.slice(0, 10)}</span>
                      <button
                        onClick={() => markNoticeAsRead(notice.id)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Mark as read
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Society Financial Health Card (Reused from Phase 2 logic) */}
            <div className="bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Society Maintenance Fund Health</span>
                </span>
                <span className="text-xs font-extrabold text-emerald-400">84% Operational</span>
              </div>
              <p className="text-xs text-slate-300">
                Our building reserve fund is currently funded at <strong>84% capacity</strong>.
                Elevator AMC, 24/7 security guard patrol, and power backup diesel reserves are fully
                funded for October 2026.
              </p>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[84%]" />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Collections: $6,500</span>
                <span>Active AMCs: 5 Contracts</span>
              </div>
            </div>

            {/* Quick Grievance Status Tracker */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>My Active Requests</span>
                </h3>
                <button
                  onClick={() => setActiveTab('grievances')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  View All ({grievances.length})
                </button>
              </div>

              {grievances.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No complaints or service queries filed.</p>
              ) : (
                <div className="space-y-1.5">
                  {grievances.slice(0, 2).map((g) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        setChatConfig({
                          isOpen: true,
                          type: 'grievance',
                          itemId: g.id,
                          itemTitle: g.title,
                        });
                      }}
                      className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-200 truncate">{g.title}</p>
                        <p className="text-[11px] text-slate-400">{g.category}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          g.status === 'Open'
                            ? 'bg-amber-500/20 text-amber-300'
                            : g.status === 'In Progress'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MY DUES & PAYMENT FLOW ================= */}
        {activeTab === 'dues' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Maintenance Dues</h3>
                <p className="text-xs text-slate-400">
                  Flat {userFlat?.flat_number || 'A-101'} Billing Ledger
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Pending Balance</span>
                <span className="text-lg font-bold text-white tabular-nums">${pendingDuesTotal}</span>
              </div>
            </div>

            {dues.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No Dues Recorded</p>
                <p className="text-xs text-slate-500 mt-1">
                  You have no outstanding or past dues on file for Flat {userFlat?.flat_number}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dues.map((due) => {
                  const isPaid = due.status === 'Paid';
                  const isVerifying = due.status === 'Under Verification';
                  const isPending = due.status === 'Pending';
                  const isOverdue =
                    due.status === 'Overdue' ||
                    (isPending && new Date(due.due_date) < new Date('2026-10-05'));

                  const statusColor = isPaid
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : isVerifying
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

                  return (
                    <div
                      key={due.id}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-extrabold text-white tabular-nums">
                              ${due.amount}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}
                            >
                              {due.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Due Date: {due.due_date}</span>
                          </p>
                        </div>

                        {/* Open chat / dispute link */}
                        <button
                          onClick={() => {
                            setChatConfig({
                              isOpen: true,
                              type: 'transaction',
                              itemId: due.id,
                              itemTitle: `Payment Due #${due.id} ($${due.amount})`,
                            });
                          }}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
                          title="Open Discussion Thread"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Audit Thread</span>
                        </button>
                      </div>

                      {due.notes && (
                        <p className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                          {due.notes}
                        </p>
                      )}

                      {/* Payment Action Bar */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        {isPaid ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <FileCheck className="w-4 h-4" />
                            <span>Payment Verified by Admin</span>
                          </div>
                        ) : isVerifying ? (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <Clock className="w-4 h-4 animate-pulse" />
                            <span>Receipt Under Verification</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDueForPayment(due);
                              setReceiptPreview(null);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-950/50"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Submit Payment / Upload Bank Receipt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: NOTICE BOARD ================= */}
        {activeTab === 'notices' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Society Notice Board</h3>
              <p className="text-xs text-slate-400">
                Official communications from CivicNest Management
              </p>
            </div>

            <div className="space-y-3">
              {announcements.map((notice) => (
                <div
                  key={notice.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        notice.urgency === 'Urgent'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}
                    >
                      {notice.urgency}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {notice.created_at.slice(0, 10)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">{notice.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{notice.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: MY GRIEVANCES & QUERIES ================= */}
        {activeTab === 'grievances' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Support & Grievances</h3>
                <p className="text-xs text-slate-400">Track and report maintenance issues</p>
              </div>
              <button
                onClick={() => setIsNewGrievanceOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Report Issue</span>
              </button>
            </div>

            {grievances.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No Grievances Logged</p>
                <p className="text-xs text-slate-500 mt-1">
                  Have an issue with plumbing, electricity, or common amenities? Click 'Report Issue' above.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {grievances.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => {
                      setChatConfig({
                        isOpen: true,
                        type: 'grievance',
                        itemId: g.id,
                        itemTitle: g.title,
                      });
                    }}
                    className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 cursor-pointer transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            {g.category}
                          </span>
                          <span className="text-slate-600 text-xs">·</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {g.created_at.slice(0, 10)}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-100 mt-0.5">
                          {g.title}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          g.status === 'Open'
                            ? 'bg-amber-500/20 text-amber-300'
                            : g.status === 'In Progress'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{g.description}</p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-blue-400 font-medium">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open WhatsApp-Style Chat</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: PROFILE & UNIT SETTINGS ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Resident Account & Unit</h3>
                <p className="text-xs text-slate-400">Manage contact information and alert preferences</p>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Profile</span>
              </button>
            </div>

            {/* Resident Identification Card */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                  alt="Avatar"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500 shadow-md shrink-0"
                />
                <div>
                  <h4 className="text-base font-bold text-white">{currentUser?.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{currentUser?.phone}</p>
                  <p className="text-xs text-slate-400">{currentUser?.email || 'No email registered'}</p>
                </div>
              </div>

              {/* Unit Specifications */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <span className="text-[10px] text-slate-400 block uppercase">Flat Unit</span>
                  <span className="font-bold text-white">{userFlat?.flat_number || 'A-101'}</span>
                  <span className="text-[11px] text-slate-500 block">{userFlat?.block || 'Block A'} (Floor {userFlat?.floor || 1})</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <span className="text-[10px] text-slate-400 block uppercase">Parking Bay</span>
                  <span className="font-bold text-white">{currentUser?.parking_slot || userFlat?.parking_slot || 'Slot P-A12'}</span>
                  <span className="text-[11px] text-slate-500 block">Basement Level 1</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <span className="text-[10px] text-slate-400 block uppercase">Unit Area</span>
                  <span className="font-bold text-white">{userFlat?.square_feet || 1250} sq ft</span>
                  <span className="text-[11px] text-slate-500 block">3 BHK Luxury</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <span className="text-[10px] text-slate-400 block uppercase">Emergency Contact</span>
                  <span className="font-bold text-white truncate block">{currentUser?.emergency_contact || '+1 555-0911'}</span>
                  <span className="text-[11px] text-slate-500 block">Kin / Security</span>
                </div>
              </div>
            </div>

            {/* Notification & Communication Status */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3 text-xs">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Notification Channels
              </span>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60">
                  <span className="text-slate-300">WhatsApp Due Notices</span>
                  <span className="text-emerald-400 font-semibold text-[11px]">Active</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60">
                  <span className="text-slate-300">Email Monthly Receipts</span>
                  <span className="text-emerald-400 font-semibold text-[11px]">Active</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60">
                  <span className="text-slate-300">SMS Outage Alerts</span>
                  <span className="text-emerald-400 font-semibold text-[11px]">Active</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors text-center"
              >
                Modify Settings & Notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= FIXED BOTTOM TAB BAR ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 max-w-md mx-auto">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'overview' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-1">Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('dues')}
            className={`flex flex-col items-center justify-center py-1 transition-colors relative ${
              activeTab === 'dues' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-1">My Dues</span>
            {pendingDuesTotal > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-3" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={`flex flex-col items-center justify-center py-1 transition-colors relative ${
              activeTab === 'notices' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] mt-1">Notices</span>
            {unreadAnnouncements.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-3" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('grievances')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'grievances' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-1">Help</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'profile' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] mt-1">Profile</span>
          </button>
        </div>
      </div>

      {/* ================= PAYMENT RECEIPT UPLOAD MODAL ================= */}
      {selectedDueForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Submit Payment Receipt</h3>
                <p className="text-[11px] text-slate-400">
                  Flat {userFlat?.flat_number} · Amount: ${selectedDueForPayment.amount}
                </p>
              </div>
              <button
                onClick={() => setSelectedDueForPayment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Preview Container */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Bank Transfer Slip / Deposit Receipt
              </label>

              {receiptPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-h-48 w-full object-contain rounded-lg"
                  />
                  <button
                    onClick={() => setReceiptPreview(null)}
                    className="absolute top-3 right-3 p-1 rounded-full bg-slate-900/80 text-rose-400 hover:text-rose-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* File input */}
                  <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-slate-800/40">
                    <Upload className="w-6 h-6 text-blue-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-200">
                      Upload from Photo Library / Camera
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      JPG, PNG, or PDF receipts up to 10MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* One-tap Test Receipts */}
                  <div>
                    <span className="text-[11px] text-slate-400">Or use instant sample receipt:</span>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectSampleReceipt('bank')}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 transition-colors"
                      >
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSampleReceipt('upi')}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 transition-colors"
                      >
                        UPI / QR Slip
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSampleReceipt('cheque')}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 transition-colors"
                      >
                        Cheque Deposit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDueForPayment(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitReceipt}
                disabled={!receiptPreview || uploading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-blue-950"
              >
                {uploading ? 'Uploading to Supabase...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FILE NEW GRIEVANCE MODAL ================= */}
      {isNewGrievanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Log Maintenance Grievance</h3>
                <p className="text-[11px] text-slate-400">Flat {userFlat?.flat_number} Service Ticket</p>
              </div>
              <button
                onClick={() => setIsNewGrievanceOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGrievance} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Issue Summary
                </label>
                <input
                  type="text"
                  placeholder="e.g. Balcony drain clogged / water overflowing"
                  value={grievanceForm.title}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, title: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={grievanceForm.category}
                    onChange={(e) => setGrievanceForm({ ...grievanceForm, category: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Elevator">Elevator</option>
                    <option value="Security">Security & Parking</option>
                    <option value="Noise & Pets">Noise & Common Area</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={grievanceForm.priority}
                    onChange={(e) =>
                      setGrievanceForm({
                        ...grievanceForm,
                        priority: e.target.value as 'High' | 'Medium' | 'Low',
                      })
                    }
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="High">High (Urgent inspection)</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide details, preferred inspection times, etc."
                  value={grievanceForm.description}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewGrievanceOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  Submit Grievance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CHAT THREAD MODAL ================= */}
      <ChatThreadModal
        isOpen={chatConfig.isOpen}
        onClose={() => setChatConfig({ ...chatConfig, isOpen: false })}
        type={chatConfig.type}
        itemId={chatConfig.itemId}
        itemTitle={chatConfig.itemTitle}
        currentUser={currentUser}
      />

      {/* ================= RESIDENT PROFILE SETTINGS MODAL ================= */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={() => loadResidentData()}
      />
    </div>
  );
};
