import {
  User, Flat, Due, Transaction, Budget, Grievance, Comment, Asset, Announcement, AdminDashboardStats
} from '../types';

type Listener = () => void;

const STORAGE_KEY = 'civicnest_supabase_db_v1';

interface DBState {
  users: User[];
  flats: Flat[];
  dues: Due[];
  transactions: Transaction[];
  budgets: Budget[];
  grievances: Grievance[];
  comments: Comment[];
  assets: Asset[];
  announcements: Announcement[];
  currentUserId: string | null;
}

const INITIAL_DATA: DBState = {
  currentUserId: 'user-admin-1', // Default to Maintenance Owner for rich immediate dashboard
  users: [
    {
      id: 'user-admin-1',
      name: 'Vikram Malhotra',
      phone: '+1 555-0199',
      role: 'Maintenance',
      contact: '+1 555-0199',
      email: 'vikram.maintenance@civicnest.org',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      emergency_contact: '+1 555-0190 (Estate Desk)',
      parking_slot: 'Admin Bay 01',
      notification_prefs: {
        whatsapp_reminders: true,
        email_receipts: true,
        sms_alerts: true,
        emergency_broadcasts: true,
      },
      created_at: '2026-01-10T08:00:00Z',
    },
    {
      id: 'user-resident-1',
      name: 'Sarah Jenkins',
      phone: '+1 555-0101',
      role: 'FlatOwner',
      contact: '+1 555-0101',
      email: 'sarah.jenkins@gmail.com',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      emergency_contact: '+1 555-0911 (David Jenkins)',
      parking_slot: 'Slot P-A12',
      notification_prefs: {
        whatsapp_reminders: true,
        email_receipts: true,
        sms_alerts: true,
        emergency_broadcasts: true,
      },
      created_at: '2026-02-14T09:30:00Z',
    },
    {
      id: 'user-resident-2',
      name: 'David Chen',
      phone: '+1 555-0102',
      role: 'FlatOwner',
      contact: '+1 555-0102',
      email: 'david.chen@outlook.com',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      emergency_contact: '+1 555-8833 (Helen Chen)',
      parking_slot: 'Slot P-B04',
      notification_prefs: {
        whatsapp_reminders: true,
        email_receipts: false,
        sms_alerts: true,
        emergency_broadcasts: true,
      },
      created_at: '2026-03-01T10:15:00Z',
    },
    {
      id: 'user-resident-3',
      name: 'Priya Sharma',
      phone: '+1 555-0103',
      role: 'FlatOwner',
      contact: '+1 555-0103',
      email: 'priya.sharma@techcorp.io',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      emergency_contact: '+1 555-4422 (Raj Sharma)',
      parking_slot: 'Slot P-C18',
      notification_prefs: {
        whatsapp_reminders: true,
        email_receipts: true,
        sms_alerts: false,
        emergency_broadcasts: true,
      },
      created_at: '2026-03-12T14:00:00Z',
    },
    {
      id: 'user-resident-4',
      name: 'Marcus Reynolds',
      phone: '+1 555-0104',
      role: 'FlatOwner',
      contact: '+1 555-0104',
      email: 'marcus.reynolds@consulting.com',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      emergency_contact: '+1 555-9090 (Chloe Reynolds)',
      parking_slot: 'Slot P-D01',
      notification_prefs: {
        whatsapp_reminders: false,
        email_receipts: true,
        sms_alerts: true,
        emergency_broadcasts: true,
      },
      created_at: '2026-04-05T11:00:00Z',
    },
    {
      id: 'user-resident-5',
      name: 'Liam O\'Connor',
      phone: '+1 555-0105',
      role: 'FlatOwner',
      contact: '+1 555-0105',
      email: 'liam.oconnor@designworks.ie',
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      emergency_contact: '+1 555-3211',
      parking_slot: 'Slot P-A08',
      created_at: '2026-04-10T11:00:00Z',
    },
    {
      id: 'user-resident-6',
      name: 'Fatima Al-Mansoor',
      phone: '+1 555-0106',
      role: 'FlatOwner',
      contact: '+1 555-0106',
      email: 'fatima.almansoor@globaltrade.ae',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      emergency_contact: '+1 555-7788',
      parking_slot: 'Slot P-D09',
      created_at: '2026-04-15T11:00:00Z',
    },
  ],
  flats: [
    { id: 'flat-101', flat_number: 'A-101', owner_id: 'user-resident-1', block: 'Block A', floor: 1, square_feet: 1250, parking_slot: 'Slot P-A12', created_at: '2026-01-01T00:00:00Z' },
    { id: 'flat-202', flat_number: 'A-202', owner_id: 'user-resident-5', block: 'Block A', floor: 2, square_feet: 1250, parking_slot: 'Slot P-A08', created_at: '2026-01-01T00:00:00Z' },
    { id: 'flat-204', flat_number: 'B-204', owner_id: 'user-resident-2', block: 'Block B', floor: 2, square_feet: 1400, parking_slot: 'Slot P-B04', created_at: '2026-01-01T00:00:00Z' },
    { id: 'flat-302', flat_number: 'C-302', owner_id: 'user-resident-3', block: 'Block C', floor: 3, square_feet: 1100, parking_slot: 'Slot P-C18', created_at: '2026-01-01T00:00:00Z' },
    { id: 'flat-401', flat_number: 'D-401', owner_id: 'user-resident-4', block: 'Block D', floor: 4, square_feet: 1600, parking_slot: 'Slot P-D01', created_at: '2026-01-01T00:00:00Z' },
    { id: 'flat-203', flat_number: 'D-203', owner_id: 'user-resident-6', block: 'Block D', floor: 2, square_feet: 1550, parking_slot: 'Slot P-D09', created_at: '2026-01-01T00:00:00Z' },
  ],
  dues: [
    {
      id: 'due-101',
      flat_id: 'flat-101',
      amount: 350,
      due_date: '2026-10-10',
      status: 'Paid',
      payment_proof_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      notes: 'Paid via NetBanking ref #NB928174 · Verified by Admin',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-03T14:20:00Z',
    },
    {
      id: 'due-202',
      flat_id: 'flat-202',
      amount: 350,
      due_date: '2026-10-10',
      status: 'Paid',
      payment_proof_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400',
      notes: 'Paid via Mobile Banking transfer #TX99281 · Verified',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-02T10:15:00Z',
    },
    {
      id: 'due-204',
      flat_id: 'flat-204',
      amount: 350,
      due_date: '2026-09-28', // Past due date -> Overdue!
      status: 'Overdue',
      notes: 'Grace period expired on Oct 1st · 1 Reminder sent via WhatsApp',
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-10-02T16:00:00Z',
    },
    {
      id: 'due-302',
      flat_id: 'flat-302',
      amount: 350,
      due_date: '2026-10-15',
      status: 'Under Verification',
      payment_proof_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      notes: 'Resident uploaded bank receipt transfer slip · Awaiting approval',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-04T16:45:00Z',
    },
    {
      id: 'due-203',
      flat_id: 'flat-203',
      amount: 400,
      due_date: '2026-10-15',
      status: 'Under Verification',
      payment_proof_url: 'https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?w=400',
      notes: 'Wire transfer confirmation attached · Awaiting review',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-05T11:20:00Z',
    },
    {
      id: 'due-401',
      flat_id: 'flat-401',
      amount: 400,
      due_date: '2026-10-20',
      status: 'Pending',
      notes: 'Standard quarterly maintenance · Due in 14 days',
      created_at: '2026-10-01T00:00:00Z',
    },
  ],
  transactions: [
    {
      id: 'tx-001',
      amount: 350,
      type: 'Credit',
      category: 'Maintenance Fee',
      description: 'Monthly Maintenance Fee - Flat A-101 (Oct 2026)',
      flat_id: 'flat-101',
      user_id: 'user-resident-1',
      created_at: '2026-10-03T14:20:00Z',
    },
    {
      id: 'tx-002',
      amount: 1350,
      type: 'Debit',
      category: 'Elevator AMC',
      description: 'Otis Elevator Q4 Comprehensive AMC & Bearing Replacement',
      created_at: '2026-10-02T11:00:00Z',
    },
    {
      id: 'tx-003',
      amount: 2400,
      type: 'Debit',
      category: 'Security Services',
      description: 'Apex Guard Services 24/7 Gate & Patrol Staff (Oct salary)',
      created_at: '2026-10-01T09:00:00Z',
    },
    {
      id: 'tx-004',
      amount: 1100,
      type: 'Debit',
      category: 'Generator Fuel & Power',
      description: '500L High-grade Diesel fuel for backup generator unit',
      created_at: '2026-10-04T15:30:00Z',
    },
    {
      id: 'tx-005',
      amount: 450,
      type: 'Debit',
      category: 'Water Tank & Plumbing',
      description: 'Quarterly chemical disinfection & pressure test for underground reservoir',
      created_at: '2026-10-03T08:45:00Z',
    },
    {
      id: 'tx-006',
      amount: 300,
      type: 'Debit',
      category: 'Landscaping & Gardening',
      description: 'Lawn trimming, sprinkler repairs, and organic fertilizer',
      created_at: '2026-10-02T16:00:00Z',
    },
  ],
  budgets: [
    { id: 'b-01', category: 'Elevator AMC', allocated_amount: 1200, month_year: '10/2026' },
    { id: 'b-02', category: 'Security Services', allocated_amount: 2500, month_year: '10/2026' },
    { id: 'b-03', category: 'Generator Fuel & Power', allocated_amount: 1800, month_year: '10/2026' },
    { id: 'b-04', category: 'Water Tank & Plumbing', allocated_amount: 800, month_year: '10/2026' },
    { id: 'b-05', category: 'Landscaping & Gardening', allocated_amount: 600, month_year: '10/2026' },
  ],
  grievances: [
    {
      id: 'g-101',
      title: 'Water seepage in Master Bathroom ceiling',
      description: 'Noticed persistent water stains and droplets coming from Flat 304 above during morning shower hours.',
      user_id: 'user-resident-2',
      flat_id: 'flat-204',
      status: 'Open',
      category: 'Plumbing & Seepage',
      priority: 'High',
      created_at: '2026-10-04T09:15:00Z',
    },
    {
      id: 'g-102',
      title: 'Elevator Tower B button panel sticking',
      description: 'The floor 4 and Door Close buttons on Elevator B frequently fail to register touch.',
      user_id: 'user-resident-1',
      flat_id: 'flat-101',
      status: 'In Progress',
      category: 'Elevator',
      priority: 'Medium',
      created_at: '2026-10-03T18:30:00Z',
    },
    {
      id: 'g-103',
      title: 'Basement boom barrier sensor delay',
      description: 'RFID sensor at basement entry gate takes up to 45 seconds to scan windshield tag.',
      user_id: 'user-resident-3',
      flat_id: 'flat-302',
      status: 'Open',
      category: 'Security & Access',
      priority: 'Medium',
      created_at: '2026-10-05T07:10:00Z',
    },
  ],
  comments: [
    {
      id: 'c-001',
      text: 'System: Grievance logged by Resident David Chen (B-204)',
      user_id: null,
      grievance_id: 'g-101',
      created_at: '2026-10-04T09:15:00Z',
    },
    {
      id: 'c-002',
      text: 'Good morning maintenance team, the water stains appeared yesterday after heavy rain. Could someone inspect today?',
      user_id: 'user-resident-2',
      grievance_id: 'g-101',
      created_at: '2026-10-04T09:18:00Z',
    },
    {
      id: 'c-003',
      text: 'Hello David, our lead plumber Suresh has been dispatched to check the junction pipe on floor 3 at 11:30 AM.',
      user_id: 'user-admin-1',
      grievance_id: 'g-101',
      created_at: '2026-10-04T09:45:00Z',
    },
    {
      id: 'c-004',
      text: 'System: Status updated to In Progress by Maintenance Admin',
      user_id: null,
      grievance_id: 'g-101',
      created_at: '2026-10-04T09:46:00Z',
    },
    {
      id: 'c-005',
      text: 'System: Payment receipt submitted by Sarah Jenkins for Due #due-101 ($350)',
      user_id: null,
      transaction_id: 'tx-001',
      created_at: '2026-10-03T14:15:00Z',
    },
    {
      id: 'c-006',
      text: 'Attached bank receipt transfer slip for October maintenance fee.',
      user_id: 'user-resident-1',
      transaction_id: 'tx-001',
      created_at: '2026-10-03T14:16:00Z',
    },
    {
      id: 'c-007',
      text: 'System: Payment verified & marked as Paid by Admin Vikram Malhotra',
      user_id: null,
      transaction_id: 'tx-001',
      created_at: '2026-10-03T14:20:00Z',
    },
  ],
  assets: [
    {
      id: 'asset-01',
      name: 'Otis Passenger Elevator Tower A',
      category: 'Vertical Transit',
      location: 'Tower A Core',
      next_maintenance_date: '2026-10-07', // In 2 days! Priority 1
      last_serviced_date: '2026-09-07',
      vendor_name: 'Otis Elevator AMC',
      vendor_contact: '+1 555-4389',
      health_score: 92,
    },
    {
      id: 'asset-02',
      name: 'Cummins Diesel Backup Generator 120kVA',
      category: 'Power Backup',
      location: 'Basement Utility Room B',
      next_maintenance_date: '2026-10-10', // In 5 days! Priority 1
      last_serviced_date: '2026-08-10',
      vendor_name: 'Cummins Power Care',
      vendor_contact: '+1 555-7721',
      health_score: 88,
    },
    {
      id: 'asset-03',
      name: 'Grundfos Hydro-Pneumatic Water Booster',
      category: 'Water Management',
      location: 'Rooftop Tank Level',
      next_maintenance_date: '2026-10-24', // In 19 days
      last_serviced_date: '2026-07-24',
      vendor_name: 'HydroTech Systems',
      vendor_contact: '+1 555-9012',
      health_score: 96,
    },
    {
      id: 'asset-04',
      name: 'Hikvision 64-Channel CCTV NVR System',
      category: 'Security & Surveillance',
      location: 'Security Control Room',
      next_maintenance_date: '2026-11-05',
      last_serviced_date: '2026-08-05',
      vendor_name: 'SecureVision Labs',
      vendor_contact: '+1 555-3344',
      health_score: 99,
    },
  ],
  announcements: [
    {
      id: 'ann-1',
      title: 'Annual General Body Meeting (AGM) - Oct 18th',
      content: 'The 2026 Annual Society General Meeting will convene this Sunday at 10:00 AM in the Clubhouse. Agenda includes solar tariff distribution, facade repainting tenders, and election of the new audit committee.',
      created_at: '2026-10-04T12:00:00Z',
      author_id: 'user-admin-1',
      urgency: 'Urgent',
      read_by: ['user-resident-1'],
    },
    {
      id: 'ann-2',
      title: 'Scheduled Water Tank Cleaning & Pressure Testing',
      content: 'Underground sumps and overhead tanks will be flushed on Wednesday from 1:00 PM to 4:00 PM. Water supply will be temporarily paused during this 3-hour maintenance interval. Please store adequate reserves.',
      created_at: '2026-10-02T15:30:00Z',
      author_id: 'user-admin-1',
      urgency: 'Normal',
      read_by: [],
    },
    {
      id: 'ann-3',
      title: 'Clubhouse EV Fast Charging Points Operational',
      content: 'Two dual-gun 22kW AC EV charging bays are now energized at basement level 1. Download the society app or scan the QR code to activate sessions at subsidized resident rates.',
      created_at: '2026-09-29T10:00:00Z',
      author_id: 'user-admin-1',
      urgency: 'Normal',
      read_by: ['user-resident-1', 'user-resident-2'],
    },
  ],
};

class SupabaseEmulator {
  private state: DBState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DBState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback to initial data
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
    this.notify();
  }

  public resetToDefault() {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveState();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public getState(): DBState {
    return this.state;
  }

  // Auth implementation matching prompt specs
  public auth = {
    getUser: async () => {
      const user = this.state.users.find(u => u.id === this.state.currentUserId) || null;
      return { data: { user }, error: null };
    },
    signInWithOtp: async ({ phone }: { phone: string }) => {
      const normalizedPhone = phone.trim().replace(/\s+/g, '');
      const user = this.state.users.find(u => u.phone.replace(/\s+/g, '') === normalizedPhone);
      if (!user) {
        return { data: null, error: { message: 'Access Denied: Your phone number is not registered by the administrator.' } };
      }
      return { data: { message: 'OTP sent successfully (Use test OTP: 123456)' }, error: null };
    },
    verifyOtp: async ({ phone, token }: { phone: string; token: string; type?: string }) => {
      const normalizedPhone = phone.trim().replace(/\s+/g, '');
      const user = this.state.users.find(u => u.phone.replace(/\s+/g, '') === normalizedPhone);
      if (!user) {
        return { data: { session: null }, error: { message: 'User not authorized.' } };
      }
      // Accept '123456' or any valid 6-digit number in test mode
      if (!token || token.length < 4) {
        return { data: { session: null }, error: { message: 'Invalid OTP code. Enter 123456.' } };
      }
      this.state.currentUserId = user.id;
      this.saveState();
      return {
        data: {
          session: {
            user: { id: user.id, role: user.role, phone: user.phone, user_metadata: { name: user.name } },
            access_token: 'mock-jwt-token-' + user.id,
          },
        },
        error: null,
      };
    },
    signOut: async () => {
      this.state.currentUserId = null;
      this.saveState();
      return { error: null };
    },
    switchUser: (userId: string) => {
      this.state.currentUserId = userId;
      this.saveState();
    },
  };

  // RPC procedures as defined in Phase 1 & 2
  public rpc = async (name: string, params: any) => {
    if (name === 'is_authorized_phone') {
      const phoneInput = (params?.phone_input || '').trim().replace(/\s+/g, '');
      const exists = this.state.users.some(u => u.phone.replace(/\s+/g, '') === phoneInput);
      return { data: exists, error: null };
    }

    if (name === 'get_admin_dashboard_stats') {
      const dues = this.state.dues;
      const expectedDues = dues.reduce((sum, d) => sum + d.amount, 0);
      const collectedDues = dues.filter(d => d.status === 'Paid').reduce((sum, d) => sum + d.amount, 0);
      const underVerification = dues.filter(d => d.status === 'Under Verification').reduce((sum, d) => sum + d.amount, 0);
      const overdueDues = dues.filter(d => d.status === 'Overdue' || (d.status === 'Pending' && new Date(d.due_date) < new Date('2026-10-05'))).reduce((sum, d) => sum + d.amount, 0);
      const collectionPercentage = expectedDues > 0 ? Math.round((collectedDues / expectedDues) * 100) : 0;

      // Overall Society Monthly Budget (aggregated across the month)
      const totalMonthlyBudget = this.state.budgets.reduce((sum, b) => sum + b.allocated_amount, 0);
      const totalMonthlySpent = this.state.transactions
        .filter(t => t.type === 'Debit' && t.created_at.startsWith('2026-10'))
        .reduce((sum, t) => sum + t.amount, 0);
      const monthlyBudgetRemaining = totalMonthlyBudget - totalMonthlySpent;
      const monthlyBudgetPercentage = totalMonthlyBudget > 0 ? Math.round((totalMonthlySpent / totalMonthlyBudget) * 100) : 0;
      const monthlyBurnRate = monthlyBudgetPercentage;

      const monthlyHistory = [
        { month: 'Jul 2026', allocated: 7200, spent: 6850, status: 'surplus' as const },
        { month: 'Aug 2026', allocated: 7200, spent: 7420, status: 'deficit' as const },
        { month: 'Sep 2026', allocated: 7400, spent: 7100, status: 'surplus' as const },
        { month: 'Oct 2026', allocated: totalMonthlyBudget, spent: totalMonthlySpent, status: totalMonthlySpent > totalMonthlyBudget ? 'deficit' as const : 'on_track' as const },
      ];

      const budgetSummary = this.state.budgets.map(b => {
        const spent = this.state.transactions
          .filter(t => t.type === 'Debit' && t.category.toLowerCase().trim() === b.category.toLowerCase().trim())
          .reduce((sum, t) => sum + t.amount, 0);
        const percentage = b.allocated_amount > 0 ? Math.round((spent / b.allocated_amount) * 100) : 0;
        return {
          category: b.category,
          allocated_amount: b.allocated_amount,
          spent_amount: spent,
          is_over_budget: spent > b.allocated_amount,
          percentage,
        };
      });

      const stats: AdminDashboardStats = {
        expected_dues: expectedDues,
        collected_dues: collectedDues,
        under_verification_dues: underVerification,
        overdue_dues: overdueDues,
        collection_percentage: collectionPercentage,
        total_monthly_budget: totalMonthlyBudget,
        total_monthly_spent: totalMonthlySpent,
        monthly_budget_remaining: monthlyBudgetRemaining,
        monthly_budget_percentage: monthlyBudgetPercentage,
        monthly_burn_rate: monthlyBurnRate,
        monthly_history: monthlyHistory,
        budget_health: budgetSummary,
      };

      return { data: stats, error: null };
    }

    return { data: null, error: { message: `Unknown RPC function: ${name}` } };
  };

  // Storage simulator
  public storage = {
    from: (bucket: string) => ({
      upload: async (fileName: string, fileData: any, options?: any) => {
        // Mock successful upload and return public url or file identifier
        return {
          data: { path: `${bucket}/${fileName}` },
          error: null,
        };
      },
      getPublicUrl: (path: string) => {
        return {
          data: { publicUrl: `https://mock-storage.civicnest.app/${path}` },
        };
      },
    }),
  };

  // Channel pubsub for real-time
  public channel = (channelName: string) => {
    return {
      on: (event: string, filter: any, callback: (payload: any) => void) => {
        const listener = () => {
          // Send last created comment
          const last = this.state.comments[this.state.comments.length - 1];
          if (last) {
            callback({ new: last });
          }
        };
        const unsub = this.subscribe(listener);
        return {
          subscribe: () => ({
            unsubscribe: unsub,
          }),
        };
      },
      subscribe: () => ({}),
    };
  };

  public removeChannel = (_channel: any) => {};

  // Table query builder
  public from = (tableName: string) => {
    return new QueryBuilder(this, tableName);
  };

  // Internal mutation helpers
  public insertRecord(table: string, records: any[]) {
    const target = (this.state as any)[table];
    if (Array.isArray(target)) {
      records.forEach(r => {
        if (!r.id) {
          r.id = `${table.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        if (!r.created_at) {
          r.created_at = new Date().toISOString();
        }
        target.push(r);
      });
      this.saveState();
      return records;
    }
    throw new Error(`Table ${table} not found in state`);
  }

  public updateRecords(table: string, updates: any, filterFn: (item: any) => boolean) {
    const target = (this.state as any)[table];
    if (Array.isArray(target)) {
      let count = 0;
      target.forEach((item, idx) => {
        if (filterFn(item)) {
          target[idx] = { ...item, ...updates, updated_at: new Date().toISOString() };
          count++;
        }
      });
      this.saveState();
      return count;
    }
    return 0;
  }
}

class QueryBuilder {
  private emulator: SupabaseEmulator;
  private tableName: string;
  private selectQuery: string = '*';
  private filters: ((item: any) => boolean)[] = [];
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private isSingle: boolean = false;

  constructor(emulator: SupabaseEmulator, tableName: string) {
    this.emulator = emulator;
    this.tableName = tableName === 'comments_grievances' ? 'comments' : tableName;
  }

  public select(columns: string = '*') {
    this.selectQuery = columns;
    return this;
  }

  public eq(column: string, value: any) {
    this.filters.push((item: any) => {
      if (column.includes('.')) {
        // e.g. flats.owner_id
        const [rel, field] = column.split('.');
        const state = this.emulator.getState();
        if (rel === 'flats' && item.flat_id) {
          const flat = state.flats.find(f => f.id === item.flat_id);
          return flat ? (flat as any)[field] === value : false;
        }
      }
      return item[column] === value;
    });
    return this;
  }

  public in(column: string, values: any[]) {
    this.filters.push((item: any) => values.includes(item[column]));
    return this;
  }

  public lte(column: string, value: any) {
    this.filters.push((item: any) => {
      const v = item[column];
      return v <= value;
    });
    return this;
  }

  public gte(column: string, value: any) {
    this.filters.push((item: any) => {
      const v = item[column];
      return v >= value;
    });
    return this;
  }

  public lt(column: string, value: any) {
    this.filters.push((item: any) => {
      const v = item[column];
      return v < value;
    });
    return this;
  }

  public order(column: string, options: { ascending: boolean } = { ascending: true }) {
    this.orderConfig = { column, ascending: options.ascending };
    return this;
  }

  public limit(count: number) {
    this.limitCount = count;
    return this;
  }

  public single() {
    this.isSingle = true;
    return this.execute();
  }

  public async insert(records: any | any[]) {
    const list = Array.isArray(records) ? records : [records];
    try {
      const inserted = this.emulator.insertRecord(this.tableName, list);
      return { data: inserted, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  public update(updates: any) {
    const filterFn = (item: any) => this.filters.every(f => f(item));
    return {
      eq: (column: string, value: any) => {
        this.eq(column, value);
        const count = this.emulator.updateRecords(this.tableName, updates, (item) => item[column] === value);
        return Promise.resolve({ data: count, error: null });
      },
      execute: async () => {
        const count = this.emulator.updateRecords(this.tableName, updates, filterFn);
        return { data: count, error: null };
      }
    };
  }

  private execute(): Promise<{ data: any; error: any }> {
    const state = this.emulator.getState();
    const tableData = (state as any)[this.tableName] || [];
    let result = [...tableData];

    // Apply filters
    for (const filter of this.filters) {
      result = result.filter(filter);
    }

    // Hydrate relations if requested
    if (this.selectQuery.includes('users(') || this.selectQuery.includes('user:users(')) {
      result = result.map(item => {
        const user = state.users.find(u => u.id === item.user_id || u.id === item.author_id);
        return { ...item, user, users: user };
      });
    }

    if (this.selectQuery.includes('flats(')) {
      result = result.map(item => {
        const flat = state.flats.find(f => f.id === item.flat_id);
        return { ...item, flats: flat, flat };
      });
    }

    // Apply ordering
    if (this.orderConfig) {
      const { column, ascending } = this.orderConfig;
      result.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      return Promise.resolve({ data: result[0] || null, error: null });
    }

    return Promise.resolve({ data: result, error: null });
  }

  // Allows await queryBuilder
  public then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    return this.execute().then(resolve, reject);
  }
}

export const supabase = new SupabaseEmulator();
