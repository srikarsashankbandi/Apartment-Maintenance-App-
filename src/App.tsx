/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './services/mockSupabase';
import { User } from './types';
import { MobileFrame } from './components/mobile/MobileFrame';
import { LoginScreen } from './components/auth/LoginScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ResidentDashboard } from './components/resident/ResidentDashboard';
import { DatabaseInspectorModal } from './components/common/DatabaseInspectorModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDbInspectorOpen, setIsDbInspectorOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize current user from emulator
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user);
      setIsLoading(false);
    };
    loadUser();

    // Listen for state changes
    const unsub = supabase.subscribe(async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user);
    });

    return () => unsub();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    supabase.auth.switchUser(user.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleSwitchUser = (userId: string) => {
    supabase.auth.switchUser(userId);
    const state = supabase.getState();
    const user = state.users.find((u) => u.id === userId) || null;
    setCurrentUser(user);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <MobileFrame
      currentUser={currentUser}
      onSwitchUser={handleSwitchUser}
      onLogout={handleLogout}
      onOpenDbInspector={() => setIsDbInspectorOpen(true)}
      isExpanded={isExpanded}
      onToggleExpanded={() => setIsExpanded(!isExpanded)}
    >
      {!currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : currentUser.role === 'Maintenance' ? (
        <AdminDashboard currentUser={currentUser} />
      ) : (
        <ResidentDashboard currentUser={currentUser} />
      )}

      {/* Supabase Architecture & PostgreSQL Live Tables Inspector */}
      <DatabaseInspectorModal
        isOpen={isDbInspectorOpen}
        onClose={() => setIsDbInspectorOpen(false)}
        onDataReset={() => {
          handleSwitchUser('user-admin-1');
        }}
      />
    </MobileFrame>
  );
}
