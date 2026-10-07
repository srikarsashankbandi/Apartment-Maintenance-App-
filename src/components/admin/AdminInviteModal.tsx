import React, { useState } from 'react';
import { supabase } from '../../services/mockSupabase';
import { X, Send, Share2, Check, UserPlus, Phone, Home, Copy, MessageCircle } from 'lucide-react';

interface AdminInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminInviteModal: React.FC<AdminInviteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    flatNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInvite, setSuccessInvite] = useState<{
    name: string;
    phone: string;
    flatNumber: string;
    message: string;
    whatsappUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.flatNumber.trim()) {
      setError('Please fill in all fields (Name, Phone Number, Flat Number)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalizedPhone = form.phone.trim();
      const newUserId = `user-${Date.now()}`;

      // 1. Insert into public.users
      const { error: userError } = await supabase.from('users').insert([
        {
          id: newUserId,
          name: form.name.trim(),
          phone: normalizedPhone,
          contact: normalizedPhone,
          role: 'FlatOwner',
          created_at: new Date().toISOString(),
        },
      ]);

      if (userError) {
        throw new Error(userError.message);
      }

      // 2. Insert into public.flats
      const { error: flatError } = await supabase.from('flats').insert([
        {
          flat_number: form.flatNumber.trim().toUpperCase(),
          owner_id: newUserId,
          created_at: new Date().toISOString(),
        },
      ]);

      if (flatError) {
        throw new Error(flatError.message);
      }

      // 3. Prepare pre-filled WhatsApp message
      const appUrl = window.location.origin;
      const message = `Welcome to our Apartment App! Download here: ${appUrl} and log in with your mobile number: ${normalizedPhone}`;
      const cleanDigits = normalizedPhone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`;

      setSuccessInvite({
        name: form.name.trim(),
        phone: normalizedPhone,
        flatNumber: form.flatNumber.trim().toUpperCase(),
        message,
        whatsappUrl,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to register resident.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (!successInvite) return;
    navigator.clipboard.writeText(successInvite.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetForm = () => {
    setForm({ name: '', phone: '', flatNumber: '' });
    setSuccessInvite(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Invite New Resident</h3>
              <p className="text-[11px] text-slate-400">Phase 1: Closed-Loop Resident Onboarding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {!successInvite ? (
          <form onSubmit={handleInvite} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name of Resident
              </label>
              <input
                type="text"
                placeholder="e.g. Elena Rostova"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Mobile Phone (Closed-loop Auth Key)</span>
                <span className="text-[10px] text-slate-500 font-mono">+1 555...</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="+1 555-0109"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Flat / Apartment Number
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. D-402 or B-105"
                  value={form.flatNumber}
                  onChange={(e) => setForm({ ...form, flatNumber: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase font-mono"
                  required
                />
              </div>
            </div>

            {/* Quick Demo Pre-fills */}
            <div className="pt-1">
              <span className="text-[11px] text-slate-500">Quick Test Fill:</span>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      name: 'Ananya Deshmukh',
                      phone: '+1 555-0105',
                      flatNumber: 'B-303',
                    })
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 transition-colors"
                >
                  Ananya (B-303)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      name: 'Julian Vance',
                      phone: '+1 555-0106',
                      flatNumber: 'A-501',
                    })
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 transition-colors"
                >
                  Julian (A-501)
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950"
              >
                {loading ? 'Registering...' : 'Register & Generate Invite'}
              </button>
            </div>
          </form>
        ) : (
          /* Success Screen with WhatsApp & Share trigger */
          <div className="mt-4 space-y-4 animate-in fade-in">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <Check className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-100">Resident Registered!</h4>
              <p className="text-xs text-slate-300 mt-1">
                {successInvite.name} has been added to Flat {successInvite.flatNumber}.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Authorized Phone: {successInvite.phone}
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>WhatsApp Invite Message:</span>
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-200 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 select-all font-sans">
                {successInvite.message}
              </p>
            </div>

            <div className="space-y-2">
              <a
                href={successInvite.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open in WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'CivicNest Apartment App Invite',
                      text: successInvite.message,
                    });
                  } else {
                    handleCopyMessage();
                  }
                }}
                className="w-full py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Trigger Device Share Dialog</span>
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
              >
                Invite Another Resident
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
