import React, { useState } from 'react';
import { supabase } from '../../services/mockSupabase';
import { User } from '../../types';
import {
  X,
  User as UserIcon,
  Phone,
  Mail,
  Home,
  Shield,
  Bell,
  Save,
  CheckCircle2,
  Car,
  PhoneCall,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onProfileUpdated?: (updatedUser: User) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  if (!isOpen || !currentUser) return null;

  const isManagement = currentUser.role === 'Maintenance';

  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [emergencyContact, setEmergencyContact] = useState(currentUser.emergency_contact || '');
  const [parkingSlot, setParkingSlot] = useState(currentUser.parking_slot || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '');

  // Notification Preferences
  const [prefs, setPrefs] = useState({
    whatsapp_reminders: currentUser.notification_prefs?.whatsapp_reminders ?? true,
    email_receipts: currentUser.notification_prefs?.email_receipts ?? true,
    sms_alerts: currentUser.notification_prefs?.sms_alerts ?? true,
    emergency_broadcasts: currentUser.notification_prefs?.emergency_broadcasts ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Avatar presets
  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);

    try {
      const state = supabase.getState();
      const userIdx = state.users.findIndex((u) => u.id === currentUser.id);

      if (userIdx !== -1) {
        const updated: User = {
          ...state.users[userIdx],
          name: name.trim(),
          phone: phone.trim(),
          contact: phone.trim(),
          email: email.trim(),
          emergency_contact: emergencyContact.trim(),
          parking_slot: parkingSlot.trim(),
          avatar_url: avatarUrl,
          notification_prefs: prefs,
        };

        state.users[userIdx] = updated;

        // If Flat Owner, also update associated flat parking slot if provided
        if (!isManagement && parkingSlot) {
          const flat = state.flats.find((f) => f.owner_id === currentUser.id);
          if (flat) {
            flat.parking_slot = parkingSlot.trim();
          }
        }

        if (onProfileUpdated) {
          onProfileUpdated(updated);
        }

        setToastMessage('Profile and preferences updated successfully!');
        setTimeout(() => {
          setToastMessage(null);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      alert(`Error saving profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isManagement ? 'Management Profile & Settings' : 'Resident Account & Unit Profile'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isManagement
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">Configure personal contact details and alert preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {toastMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Profile Photo / Avatar Presets */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">Avatar Photo</label>
            <div className="flex items-center gap-4">
              <img
                src={avatarUrl || avatarPresets[0]}
                alt="Profile"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500 shadow-md shrink-0"
              />
              <div className="flex-1">
                <p className="text-[11px] text-slate-400 mb-2">Choose profile photo preset:</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {avatarPresets.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        avatarUrl === url ? 'border-blue-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-9 h-9 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Info Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Contact Identification</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Registered Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="resident@civicnest.com"
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Emergency Contact</label>
                <div className="relative">
                  <PhoneCall className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+1 555-0911 (Kin / Desk)"
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Flat / Parking Slot */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isManagement ? 'Allocated Office / Workstation Bay' : 'Assigned Parking Slot'}
              </label>
              <div className="relative">
                <Car className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={parkingSlot}
                  onChange={(e) => setParkingSlot(e.target.value)}
                  placeholder={isManagement ? 'Admin Office Suite 101' : 'Slot P-A12 (Basement 1)'}
                  className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notification & Communication Preferences */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Communication Preferences</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer hover:bg-slate-850">
                <div>
                  <span className="font-semibold text-slate-200 block">WhatsApp Reminders & Broadcasts</span>
                  <span className="text-[11px] text-slate-400">Receive instant due notices & urgent society updates</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.whatsapp_reminders}
                  onChange={(e) => setPrefs({ ...prefs, whatsapp_reminders: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer hover:bg-slate-850">
                <div>
                  <span className="font-semibold text-slate-200 block">Email Financial Statements</span>
                  <span className="text-[11px] text-slate-400">Monthly receipt copies and audit reports delivered to email</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email_receipts}
                  onChange={(e) => setPrefs({ ...prefs, email_receipts: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer hover:bg-slate-850">
                <div>
                  <span className="font-semibold text-slate-200 block">SMS Critical Alerts</span>
                  <span className="text-[11px] text-slate-400">Water tank cleaning and power outage notices via SMS</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.sms_alerts}
                  onChange={(e) => setPrefs({ ...prefs, sms_alerts: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-950"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
