import React, { useState } from 'react';
import { supabase } from '../../services/mockSupabase';
import { User } from '../../types';
import { Phone, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Building2, Lock } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('+1 555-0199'); // Pre-filled with Admin for convenience
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Step 1: Closed-loop Phone Check & Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      // 1. Check custom RPC function if phone exists in public.users
      const { data: isAuthorized, error: checkError } = await supabase.rpc(
        'is_authorized_phone',
        { phone_input: phone }
      );

      if (checkError) {
        throw new Error(checkError.message);
      }

      if (!isAuthorized) {
        setErrorMessage(
          'Access Denied: Your phone number is not registered by the apartment administrator. Please contact maintenance to request an invite.'
        );
        setLoading(false);
        return;
      }

      // 2. Request OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
      if (otpError) {
        setErrorMessage(otpError.message);
      } else {
        setStep('otp');
        setInfoMessage('One-time password dispatched! (For prototype testing, use OTP: 123456)');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate phone number.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Route based on Role
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (error || !data?.session) {
        throw new Error(error?.message || 'Verification failed. Try OTP: 123456');
      }

      // Fetch user profile from public.users table to verify role
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      if (userProfile) {
        onLoginSuccess(userProfile);
      } else {
        throw new Error('User profile record not found.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification token.');
    } finally {
      setLoading(false);
    }
  };

  const selectTestAccount = (testPhone: string, testName: string, role: string) => {
    setPhone(testPhone);
    setErrorMessage(null);
    setInfoMessage(`Selected ${testName} (${role})`);
    setStep('phone');
  };

  return (
    <div className="flex flex-col justify-between min-h-full p-4 sm:p-6 text-slate-100">
      {/* Brand & Security Header */}
      <div className="pt-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-950/50 mb-3">
          <Building2 className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">CivicNest</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Private Apartment Maintenance & Resident Financial Portal
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Closed-Loop Authorization System</span>
        </div>
      </div>

      {/* Main Auth Form */}
      <div className="my-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-xs flex items-start gap-2 animate-in fade-in">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-wide"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Must be pre-approved by society management.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-950"
            >
              <span>{loading ? 'Checking Registry...' : 'Send Login OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Enter 6-Digit SMS Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  Change Number
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-center text-lg font-mono tracking-widest text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 text-center font-mono">
                Sent to: {phone} (Demo Code: 123456)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950"
            >
              <span>{loading ? 'Verifying...' : 'Verify OTP & Enter App'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Preset Test Profiles for instant evaluation */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 block">
          One-Tap Test Identities:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-left">
          <button
            type="button"
            onClick={() => selectTestAccount('+1 555-0199', 'Vikram Malhotra', 'Maintenance Lead')}
            className={`p-2 rounded-xl text-left border transition-all ${
              phone === '+1 555-0199'
                ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Vikram (Admin)</span>
              <span className="text-[10px] text-blue-400 font-mono">Lead</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              +1 555-0199
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectTestAccount('+1 555-0101', 'Sarah Jenkins', 'Flat A-101')}
            className={`p-2 rounded-xl text-left border transition-all ${
              phone === '+1 555-0101'
                ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Sarah (Resident)</span>
              <span className="text-[10px] text-emerald-400 font-mono">A-101</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              +1 555-0101 (Paid)
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectTestAccount('+1 555-0102', 'David Chen', 'Flat B-204')}
            className={`p-2 rounded-xl text-left border transition-all ${
              phone === '+1 555-0102'
                ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">David (Resident)</span>
              <span className="text-[10px] text-rose-400 font-mono">B-204</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              +1 555-0102 (Overdue)
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectTestAccount('+1 555-9999', 'Unknown Strangler', 'Unregistered')}
            className={`p-2 rounded-xl text-left border transition-all ${
              phone === '+1 555-9999'
                ? 'bg-rose-600/20 border-rose-500 text-rose-200'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300">Unauthorized Test</span>
              <span className="text-[10px] text-rose-400 font-mono">Test RLS</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              +1 555-9999 (Blocked)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
