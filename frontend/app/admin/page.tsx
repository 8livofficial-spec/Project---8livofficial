'use client';

import { Suspense, useState, useEffect, useRef, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { ShieldCheck, Users, User, Video, Apple, Dumbbell, Clock, Stethoscope, Pill, Syringe, Activity, CheckCircle2, Home as HomeIcon, PhoneOff, FileText, Scale, Target, ChevronRight, AlertCircle, Wallet, ArrowDownToLine, RefreshCw, LogOut, Link2, Timer, Trash2, GitMerge, ClipboardList, DollarSign, Calendar, UserCheck, XCircle, TrendingUp, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import SessionMonitor from '@/components/admin/SessionMonitor';

type AdminTab =
  | 'dashboard'
  | 'patients'
  | 'providers'
  | 'doctors'
  | 'dietitians'
  | 'nutritionists'
  | 'appointments'
  | 'video-consultations'
  | 'memberships'
  | 'analytics'
  | 'payments'
  | 'provider-wallets'
  | 'reports'
  | 'notifications'
  | 'audit-logs'
  | 'platform-settings'
  | 'admin-profile';

type AdminView = 'dashboard' | 'patients' | 'providers' | 'doctors' | 'connections' | 'payments' | 'provider-wallets' | 'membership-plans' | 'staff' | 'placeholder';
// ── Helper: format duration from timestamps ──────────────────────────────
function fmtDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const diffMs = end - start;
  if (diffMs < 0) return '—';
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  const s = Math.floor((diffMs % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientLogs, setPatientLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [prescribeLoading, setPrescribeLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [providerPayouts, setProviderPayouts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [walletSubTab, setWalletSubTab] = useState<'overview' | 'payouts' | 'audit'>('overview');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProvider, setAdjustingProvider] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);

  // ── Auth states ────────────────────────────────────────────────────────
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── New Tab state ──────────────────────────────────────────────────────
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [providersWarning, setProvidersWarning] = useState('');

  // ── Care Team Assignment state ──────────────────────────────────────────
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  // ── Pagination and KPI States ──────────────────────────────────────────
  const [patientsPage, setPatientsPage] = useState(1);
  const [patientsTotalPages, setPatientsTotalPages] = useState(1);
  const [patientsLimit] = useState(25);
  const [patientsCount, setPatientsCount] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);

  const [providersPage, setProvidersPage] = useState(1);
  const [providersLimit] = useState(25);

  const [connectionsPage, setConnectionsPage] = useState(1);
  const [connectionsTotalPages, setConnectionsTotalPages] = useState(1);
  const [connectionsLimit] = useState(25);

  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsLimit] = useState(25);

  const [payoutsPage, setPayoutsPage] = useState(1);
  const [payoutsTotalPages, setPayoutsTotalPages] = useState(1);
  const [payoutsLimit] = useState(25);

  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLimit] = useState(25);

  const [paginatedPayouts, setPaginatedPayouts] = useState<any[]>([]);
  const [successfulPaymentsCount, setSuccessfulPaymentsCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [failedPaymentsCount, setFailedPaymentsCount] = useState(0);
  const [refundsCount, setRefundsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [consultationRevenue, setConsultationRevenue] = useState(0);
  const [membershipRevenue, setMembershipRevenue] = useState(0);
  const [totalProviderEarnings, setTotalProviderEarnings] = useState(0);

  // Helper search change that resets pages
  const handleSearchChange = (val: string) => {
    setManagementSearch(val);
    setPatientsPage(1);
    setProvidersPage(1);
    setConnectionsPage(1);
    setPaymentsPage(1);
    setPayoutsPage(1);
    setAuditPage(1);
  };

  // ── Revenue State ───────────────────────────────────────────────────────
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [dashboardSummary, setDashboardSummary] = useState<any>({
    totalPatients: 0,
    activePatients: 0,
    totalDoctors: 0,
    doctorsOnline: 0,
    todaysConsultations: 0,
    activeVideoCalls: 0,
    completedConsultations: 0,
    pendingConsultations: 0,
    missedConsultations: 0,
    cancelledConsultations: 0,
    patientsWaiting: 0,
    monthlyRevenue: 0,
    platformEarnings: 0,
    pendingPayouts: 0,
    goldMembers: 0,
    silverMembers: 0
  });
  const [dashboardRecentActivities, setDashboardRecentActivities] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const fetchDashboardData = async (adminId = adminUser?.id) => {
    if (!adminId) return;
    setDashboardLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard?adminId=${adminId}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardSummary(data.summary || {});
        setDashboardRecentActivities(data.recentActivities || []);
      }
    } catch (err) {
      console.error('[Dashboard Fetch Error]', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // ── Staff Form state ────────────────────────────────────────────────────
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'admin' | 'doctor' | 'dietitian' | 'trainer'>('doctor');
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffDeleting, setStaffDeleting] = useState(false);
  const [providerSubmitting, setProviderSubmitting] = useState(false);

  // ── Plan Form state ─────────────────────────────────────────────────────
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planConsultFee, setPlanConsultFee] = useState('499');
  const [planFeatures, setPlanFeatures] = useState('');
  const [planIsActive, setPlanIsActive] = useState(true);
  const [planDiscountCode, setPlanDiscountCode] = useState('');
  const [planDiscountPercent, setPlanDiscountPercent] = useState('0');
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [managementSearch, setManagementSearch] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('all');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [paymentTab, setPaymentTab] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [providerFullName, setProviderFullName] = useState('');
  const [providerEmail, setProviderEmail] = useState('');
  const [providerPassword, setProviderPassword] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerRole, setProviderRole] = useState<'doctor' | 'dietitian' | 'nutritionist' | 'fitness_coach'>('doctor');
  const [providerSpecialization, setProviderSpecialization] = useState('Endocrinologist');
  const [providerQualification, setProviderQualification] = useState('');
  const [providerExperience, setProviderExperience] = useState('');
  const [providerLicense, setProviderLicense] = useState('');
  const [providerPhoto, setProviderPhoto] = useState('');
  const [providerConsultationType, setProviderConsultationType] = useState('Video Consultation');
  const [providerPayoutAmount, setProviderPayoutAmount] = useState('300');
  const [providerStatus, setProviderStatus] = useState<'active' | 'inactive'>('active');
  const [providerBankDetails, setProviderBankDetails] = useState('');
  const [providerUpi, setProviderUpi] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab') as AdminTab | null;
    const validTabs: AdminTab[] = [
      'dashboard', 'patients', 'providers', 'doctors', 'dietitians', 'nutritionists', 'appointments',
      'video-consultations', 'memberships', 'analytics', 'payments', 'provider-wallets',
      'reports', 'notifications', 'audit-logs', 'platform-settings', 'admin-profile',
    ];
    if (tab && validTabs.includes(tab)) {
      setAdminTab(tab);
    }
  }, [searchParams]);

  const resetStaffForm = () => {
    setStaffEmail('');
    setStaffPassword('');
    setStaffRole('doctor');
    setStaffFirstName('');
    setStaffLastName('');
    setStaffPhone('');
  };

  const providerSpecializationOptions: Record<string, string[]> = {
    doctor: ['Endocrinologist', 'General Physician', 'Diabetologist'],
    dietitian: ['Clinical Dietitian', 'Weight Loss Dietitian', 'Diabetes Dietitian'],
    nutritionist: ['Weight Management Nutritionist', 'Sports Nutritionist', 'Lifestyle Nutritionist'],
    fitness_coach: ['Home Workout', 'Gym Workout', 'Weight Loss Fitness Coach'],
  };

  const resetProviderForm = () => {
    setProviderFullName('');
    setProviderEmail('');
    setProviderPassword('');
    setProviderPhone('');
    setProviderRole('doctor');
    setProviderSpecialization('Endocrinologist');
    setProviderQualification('');
    setProviderExperience('');
    setProviderLicense('');
    setProviderPhoto('');
    setProviderConsultationType('Video Consultation');
    setProviderPayoutAmount('300');
    setProviderStatus('active');
    setProviderBankDetails('');
    setProviderUpi('');
    setSelectedProvider(null);
  };

  const fetchProviders = async () => {
    if (!adminUser?.id) return;
    try {
      const res = await fetch(`/api/admin/providers?adminId=${adminUser.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setProviders(data.providers || []);
      setProvidersWarning(data.warning || '');
    } catch (err) {
      console.error('[Providers Fetch Error]', err);
    }
  };

  const handleCreateProvider = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminUser?.id) return;
    if (!providerFullName || !providerEmail || (!selectedProvider && !providerPassword) || !providerRole) {
      alert(selectedProvider ? 'Full name, email, and role are required.' : 'Full name, email, password, and role are required.');
      return;
    }

    setProviderSubmitting(true);
    try {
      const payload = selectedProvider
        ? {
          adminId: adminUser.id,
          providerId: selectedProvider.provider_id,
          updates: {
            full_name: providerFullName,
            email: providerEmail,
            phone_number: providerPhone,
            role: providerRole,
            specialization: providerSpecialization,
            qualification: providerQualification,
            years_experience: Number(providerExperience || 0),
            registration_number: providerLicense,
            profile_photo_url: providerPhoto,
            consultation_type: providerConsultationType,
            payout_amount: Number(providerPayoutAmount || 0),
            status: providerStatus,
            bank_account_details: providerBankDetails ? { notes: providerBankDetails } : {},
            upi_id: providerUpi,
          },
        }
        : {
          adminId: adminUser.id,
          fullName: providerFullName,
          email: providerEmail,
          password: providerPassword,
          phoneNumber: providerPhone,
          role: providerRole,
          specialization: providerSpecialization,
          qualification: providerQualification,
          yearsExperience: providerExperience,
          registrationNumber: providerLicense,
          profilePhotoUrl: providerPhoto,
          consultationType: providerConsultationType,
          payoutAmount: providerPayoutAmount,
          status: providerStatus,
          bankAccountDetails: providerBankDetails ? { notes: providerBankDetails } : {},
          upiId: providerUpi,
        };
      const res = await fetch('/api/admin/providers', {
        method: selectedProvider ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save provider.');
      alert(selectedProvider ? 'Provider updated successfully.' : 'Provider created successfully.');
      resetProviderForm();
      await Promise.all([fetchProviders(), fetchStaffProfiles(), fetchPayoutsData()]);
    } catch (err: any) {
      alert(err.message || 'Failed to create provider.');
    } finally {
      setProviderSubmitting(false);
    }
  };

  const handleProviderStatus = async (provider: any, status: 'active' | 'inactive') => {
    if (!adminUser?.id) return;
    try {
      const res = await fetch('/api/admin/providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser.id, providerId: provider.provider_id, updates: { status } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update provider.');
      await fetchProviders();
    } catch (err: any) {
      alert(err.message || 'Failed to update provider.');
    }
  };

  const openAdminTab = (tab: AdminTab) => {
    setAdminTab(tab);
    router.push(`/admin?tab=${tab}`);
  };

  const editProvider = (provider: any) => {
    setSelectedProvider(provider);
    setProviderFullName(provider.full_name || provider.name || '');
    setProviderEmail(provider.email || '');
    setProviderPassword('');
    setProviderPhone(provider.phone_number || '');
    const role = (provider.role || 'doctor') as typeof providerRole;
    setProviderRole(role);
    setProviderSpecialization(provider.specialization || providerSpecializationOptions[role]?.[0] || '');
    setProviderQualification(provider.qualification || '');
    setProviderExperience(String(provider.years_experience || ''));
    setProviderLicense(provider.registration_number || '');
    setProviderPhoto(provider.profile_photo_url || '');
    setProviderConsultationType(provider.consultation_type || 'Video Consultation');
    setProviderPayoutAmount(String(provider.payout_amount || 0));
    setProviderStatus(provider.status || 'active');
    setProviderBankDetails(provider.bank_account_details?.notes || '');
    setProviderUpi(provider.upi_id || '');
  };

  const viewPaymentReceipt = (payment: any) => {
    alert([
      '8liv Payment Receipt',
      `Payment ID: ${payment.id || 'N/A'}`,
      `Razorpay ID: ${payment.transaction_id || payment.metadata?.razorpay_payment_id || 'N/A'}`,
      `Type: ${payment.payment_type || 'payment'}`,
      `Amount: Rs ${Number(payment.amount || 0).toLocaleString('en-IN')}`,
      `Status: ${payment.status || 'pending'}`,
      `Date: ${payment.created_at ? new Date(payment.created_at).toLocaleString('en-IN') : 'N/A'}`,
    ].join('\n'));
  };

  const downloadPaymentReceipt = (payment: any) => {
    const receipt = {
      brand: '8liv',
      paymentId: payment.id,
      razorpayPaymentId: payment.transaction_id || payment.metadata?.razorpay_payment_id,
      type: payment.payment_type,
      amount: Number(payment.amount || 0),
      method: payment.payment_method || payment.metadata?.method || 'Razorpay',
      status: payment.status,
      date: payment.created_at,
    };
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `8liv-receipt-${payment.id || payment.transaction_id || 'payment'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const refundPayment = async (payment: any) => {
    if (!adminUser?.id) return;
    const confirmed = window.confirm(`Request refund for Rs ${Number(payment.amount || 0).toLocaleString('en-IN')}?`);
    if (!confirmed) return;
    try {
      const res = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser.id, paymentId: payment.id, reason: 'Admin requested refund' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request refund.');
      alert('Refund request recorded.');
      await fetchPayoutsData();
    } catch (err: any) {
      alert(err.message || 'Failed to request refund.');
    }
  };

  const openPatientFromPayment = (patientId: string) => {
    const patient = assessments.find(item => item.patient_id === patientId || item.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      openAdminTab('patients');
    } else {
      alert('Patient record not found for this payment.');
    }
  };

  const updatePayoutStatus = async (transactionId: string, payoutStatus: string) => {
    if (!adminUser?.id || !transactionId) return;
    try {
      const res = await fetch('/api/admin/provider-payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser.id, transactionId, payoutStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payout.');
      await fetchPayoutsData();
    } catch (err: any) {
      alert(err.message || 'Failed to update payout.');
    }
  };

  const savePlan = async (plan: any, updates: Record<string, any>) => {
    if (!adminUser?.id) return;
    const name = updates.name || plan.name;
    const priceMonthly = updates.priceMonthly ?? plan.price_monthly ?? 0;
    const features = updates.features ?? plan.features ?? [];
    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminId: adminUser.id,
        name,
        priceMonthly,
        consultationFee: updates.consultationFee ?? plan.consultation_fee ?? 499,
        features,
        isActive: updates.isActive ?? plan.is_active ?? true,
        discountCode: updates.discountCode ?? plan.discount_code,
        discountPercent: updates.discountPercent ?? plan.discount_percent ?? 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update plan.');
    await fetchPlans();
  };

  const handleRemoveStaff = async (staffMember: any) => {
    if (!adminUser) return;
    if (staffMember.id === adminUser.id) {
      alert("Security Block: You cannot delete your own logged-in admin account!");
      return;
    }

    const firstConfirm = window.confirm(
      `Are you absolutely sure you want to remove ${staffMember.first_name} ${staffMember.last_name} (${staffMember.role})?\n\nThis will completely delete their account and dissociate them from all assigned care teams.`
    );
    if (!firstConfirm) return;

    const doubleCheck = window.prompt(
      `CRITICAL WARNING: This action cannot be undone.\nTo permanently delete this user, please type the word 'REMOVE' below:`
    );
    if (doubleCheck !== 'REMOVE') {
      alert("Action cancelled. Input did not match 'REMOVE'.");
      return;
    }

    setStaffDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?adminId=${adminUser.id}&userId=${staffMember.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete staff member.');
      }
      alert(`Successfully removed ${staffMember.first_name} ${staffMember.last_name} from the system.`);
      setSelectedStaff(null);
      
      // Refresh all necessary listings in background
      await Promise.all([
        fetchStaffProfiles(),
        fetchPayoutsData(),
        fetchConnections(),
        fetchPatients()
      ]);
    } catch (err: any) {
      console.error('[Remove Staff Error]', err);
      alert('Error removing staff member: ' + err.message);
    } finally {
      setStaffDeleting(false);
    }
  };

  const resetPlanForm = () => {
    setPlanName('');
    setPlanPrice('');
    setPlanConsultFee('499');
    setPlanFeatures('');
    setPlanIsActive(true);
    setPlanDiscountCode('');
    setPlanDiscountPercent('0');
  };

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        setAuthChecking(true);
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr || !session?.user) {
          setAuthError('Please sign in to access the administrator control center.');
          setAuthChecking(false);
          setLoading(false);
          router.push('/');
          return;
        }

        const profileRes = await fetch(`/api/admin/profile?userId=${session.user.id}`);
        if (!profileRes.ok) {
          setAuthError('Access Denied. You do not have permission to view the admin control center.');
          setAuthChecking(false);
          setLoading(false);
          return;
        }

        const { profile } = await profileRes.json();

        if (!profile || profile.role !== 'admin') {
          setAuthError('Access Denied. You do not have permission to view the admin control center.');
          setAuthChecking(false);
          setLoading(false);
          return;
        }

        setAdminUser(profile);
        setAuthChecking(false);
      } catch (err: any) {
        setAuthError('Authentication verification failed: ' + (err.message || err));
        setAuthChecking(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoad();
  }, []);

  // ── Tab specific effects with pagination dependencies ──────────────────
  useEffect(() => {
    if (!adminUser || adminTab !== 'dashboard') return;
    fetchDashboardData(adminUser.id);
  }, [adminTab, adminUser]);

  useEffect(() => {
    if (!adminUser || adminTab !== 'patients') return;
    fetchPatients();
  }, [adminTab, adminUser, patientsPage, managementSearch, eligibilityFilter, membershipFilter, paymentFilter, appointmentFilter]);

  useEffect(() => {
    if (!adminUser || adminTab !== 'providers') return;
    fetchProviders();
  }, [adminTab, adminUser, managementSearch]);

  useEffect(() => {
    if (!adminUser || (adminTab !== 'appointments' && adminTab !== 'video-consultations')) return;
    fetchConnections();
  }, [adminTab, adminUser, connectionsPage, managementSearch, appointmentFilter]);

  useEffect(() => {
    if (!adminUser || (adminTab !== 'provider-wallets' && adminTab !== 'payments')) return;
    fetchPayoutsData();
  }, [adminTab, adminUser, paymentsPage, payoutsPage, auditPage, managementSearch, paymentTab]);

  useEffect(() => {
    if (!adminUser || adminTab !== 'memberships') return;
    fetchPlans();
  }, [adminTab, adminUser]);

  useEffect(() => {
    if (!adminUser || (adminTab !== 'dietitians' && adminTab !== 'nutritionists')) return;
    fetchStaffProfiles();
  }, [adminTab, adminUser]);

  // ── Fetch staff profiles ───────────────────────────────────────────────
  const fetchStaffProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, phone_number, email')
        .in('role', ['admin', 'doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer'])
        .order('role', { ascending: true });
      if (!error && data) {
        setAllStaff(data);
      }
    } catch (err) {
      console.error('[Staff Fetch Error]', err);
    }
  };

  // ── Fetch plans from backend API ───────────────────────────────────────
  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('[Plans Fetch Error]', err);
    }
  };

  // ── Fetch assignments for a patient ────────────────────────────────────
  const fetchPatientAssignment = async (patientId: string) => {
    if (!adminUser) return;
    setAssignmentLoading(true);
    try {
      const res = await fetch(`/api/admin/assignments?patientId=${patientId}&adminId=${adminUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.assignment) {
          setCurrentAssignment({
            doctor_id: data.assignment.doctor_id || '',
            dietitian_id: data.assignment.dietitian_id || '',
            trainer_id: data.assignment.trainer_id || ''
          });
        } else {
          setCurrentAssignment({ doctor_id: '', dietitian_id: '', trainer_id: '' });
        }
      }
    } catch (err) {
      console.error('Failed to fetch patient assignments:', err);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // ── Update Care Team clinician assignment ───────────────────────────────
  const handleUpdateAssignment = async (roleType: 'doctor' | 'dietitian' | 'trainer', value: string) => {
    if (!adminUser || !selectedPatient) return;
    setUpdatingAssignment(true);
    try {
      const payload = {
        adminId: adminUser.id,
        patientId: selectedPatient.patient_id,
        doctorId: roleType === 'doctor' ? value : currentAssignment?.doctor_id,
        dietitianId: roleType === 'dietitian' ? value : currentAssignment?.dietitian_id,
        trainerId: roleType === 'trainer' ? value : currentAssignment?.trainer_id,
      };

      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCurrentAssignment({
          doctor_id: payload.doctorId || '',
          dietitian_id: payload.dietitianId || '',
          trainer_id: payload.trainerId || ''
        });
        alert('Care team updated and patient notified! ✅');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update care team.');
      }
    } catch (err: any) {
      alert('Error updating assignment: ' + err.message);
    } finally {
      setUpdatingAssignment(false);
    }
  };

  // ── Fetch doctor-patient connections ───────────────────────────────────
  const fetchConnections = async () => {
    try {
      let query = supabase
        .from('doctor_consultations')
        .select('id, patient_id, doctor_id, status, booking_date, booking_time, prescription_type, prescription_text, prescription_notes, call_started_at, call_ended_at, created_at', { count: 'exact' });

      if (appointmentFilter !== 'all') {
        query = query.eq('status', appointmentFilter);
      } else {
        query = query.in('status', ['scheduled', 'calling', 'attended', 'approved', 'rejected']);
      }

      const normalizedSearch = managementSearch.trim().toLowerCase();
      if (normalizedSearch) {
        const [matchedPatients, matchedDoctors] = await Promise.all([
          supabase.from('health_assessments').select('patient_id').or(`full_name.ilike.%${normalizedSearch}%,first_name.ilike.%${normalizedSearch}%,last_name.ilike.%${normalizedSearch}%`),
          supabase.from('doctor_profiles').select('id').ilike('full_name', `%${normalizedSearch}%`)
        ]);
        const matchingPatientIds = (matchedPatients.data || []).map((p: any) => p.patient_id);
        const matchingDoctorIds = (matchedDoctors.data || []).map((d: any) => d.id);

        const orConditions = [];
        if (matchingPatientIds.length > 0) orConditions.push(`patient_id.in.(${matchingPatientIds.join(',')})`);
        if (matchingDoctorIds.length > 0) orConditions.push(`doctor_id.in.(${matchingDoctorIds.join(',')})`);
        
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        } else {
          setConnections([]);
          setConnectionsTotalPages(0);
          return;
        }
      }

      const from = (connectionsPage - 1) * connectionsLimit;
      const to = connectionsPage * connectionsLimit - 1;

      const { data: cons, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!cons || cons.length === 0) { 
        setConnections([]); 
        setConnectionsTotalPages(0);
        return; 
      }

      setConnectionsTotalPages(Math.ceil((count || 0) / connectionsLimit));

      // Fetch doctor profiles
      const docIds = [...new Set(cons.map((c: any) => c.doctor_id).filter(Boolean))];
      const { data: docProfiles } = docIds.length > 0 
        ? await supabase.from('doctor_profiles').select('id, full_name').in('id', docIds)
        : { data: [] };

      // Fetch patient names from health_assessments
      const patientIds = [...new Set(cons.map((c: any) => c.patient_id).filter(Boolean))];
      const { data: patientData } = patientIds.length > 0
        ? await supabase.from('health_assessments').select('patient_id, full_name, first_name, last_name, phone_number, age').in('patient_id', patientIds)
        : { data: [] };

      const docMap: Record<string, string> = {};
      if (docProfiles) docProfiles.forEach((d: any) => { docMap[d.id] = d.full_name || 'Dr. Expert'; });

      const patMap: Record<string, any> = {};
      if (patientData) patientData.forEach((p: any) => { patMap[p.patient_id] = p; });

      const enriched = cons.map((c: any) => ({
        ...c,
        doctor_name: docMap[c.doctor_id || ''] || 'Unknown Doctor',
        patient_name: patMap[c.patient_id]?.full_name || `${patMap[c.patient_id]?.first_name || ''} ${patMap[c.patient_id]?.last_name || ''}`.trim() || 'Unknown Patient',
        patient_phone: patMap[c.patient_id]?.phone_number || '',
        patient_age: patMap[c.patient_id]?.age || '',
      }));

      setConnections(enriched);
    } catch (err) {
      console.error('[Connections Fetch Error]', err);
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('health_assessments')
        .select(`
          id, patient_id, full_name, first_name, last_name, age, phone_number, address, dob_month, dob_day, dob_year, agree_terms,
          height_cm, weight_kg, goal_weight_kg, tried_weight_program, extra_medical_info, prescription_type,
          health_conditions_two, glp1_image_url,
          is_eligible, medical_history, booking_date, booking_time, room_url, local_food, workout_preference, created_at, consultation_fee_paid
        `, { count: 'exact' });

      // Apply search on server
      const normalizedSearch = managementSearch.trim().toLowerCase();
      if (normalizedSearch) {
        query = query.or(`full_name.ilike.%${normalizedSearch}%,first_name.ilike.%${normalizedSearch}%,last_name.ilike.%${normalizedSearch}%,phone_number.ilike.%${normalizedSearch}%`);
      }

      // Apply filters on server
      if (eligibilityFilter !== 'all') {
        query = query.eq('is_eligible', eligibilityFilter === 'true');
      }
      if (membershipFilter !== 'all') {
        query = query.ilike('membership_tier', `%${membershipFilter}%`);
      }
      if (paymentFilter !== 'all') {
        query = query.eq('consultation_fee_paid', paymentFilter === 'paid');
      }
      if (appointmentFilter !== 'all') {
        if (appointmentFilter === 'scheduled') {
          query = query.not('booking_date', 'is', null);
        } else {
          query = query.is('booking_date', null);
        }
      }

      const from = (patientsPage - 1) * patientsLimit;
      const to = patientsPage * patientsLimit - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        setAssessments(data);
        setPatientsTotalPages(Math.ceil((count || 0) / patientsLimit));
      }

      // Fetch head-only counts for the cards (so they show system-wide stats, not page-wide stats)
      const [totalRes, eligibleRes, paidRes, apptRes, progRes] = await Promise.all([
        supabase.from('health_assessments').select('*', { head: true, count: 'exact' }),
        supabase.from('health_assessments').select('*', { head: true, count: 'exact' }).eq('is_eligible', true),
        supabase.from('health_assessments').select('*', { head: true, count: 'exact' }).eq('consultation_fee_paid', true),
        supabase.from('health_assessments').select('*', { head: true, count: 'exact' }).not('booking_date', 'is', null),
        supabase.from('health_assessments').select('*', { head: true, count: 'exact' }).not('weight_kg', 'is', null).not('goal_weight_kg', 'is', null),
      ]);

      setPatientsCount(totalRes.count || 0);
      setEligibleCount(eligibleRes.count || 0);
      setPaidCount(paidRes.count || 0);
      setAppointmentCount(apptRes.count || 0);
      setProgressCount(progRes.count || 0);

    } catch (err) {
      console.error('[Patients Fetch Error]', err);
    }
    setLoading(false);
  };

  const fetchPayoutsData = async () => {
    setPayoutLoading(true);
    try {
      const { data: profiles } = await supabase.from('doctor_profiles').select('*');
      const { data: wallets } = await supabase.from('wallet_accounts').select('*');

      // Fetch total provider earnings sum (lightweight select)
      const { data: sumData } = await supabase
        .from('wallet_ledger_transactions')
        .select('amount')
        .eq('transaction_type', 'CONSULTATION_CREDIT')
        .eq('status', 'SUCCESS');
      const totalEarned = (sumData || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      setTotalProviderEarnings(totalEarned);

      // Light payouts for KPIs and filters
      const { data: lightPayoutsData } = await supabase.from('provider_payouts').select('provider_id, payout_status, payout_amount');
      setProviderPayouts(lightPayoutsData || []);

      // Paginated payouts for table view
      const payoutsFrom = (payoutsPage - 1) * payoutsLimit;
      const payoutsTo = payoutsPage * payoutsLimit - 1;
      const { data: paginatedPayoutsData, count: payoutsCount } = await supabase
        .from('provider_payouts')
        .select('*', { count: 'exact' })
        .order('initiated_at', { ascending: false })
        .range(payoutsFrom, payoutsTo);
      setPaginatedPayouts(paginatedPayoutsData || []);
      setPayoutsTotalPages(Math.ceil((payoutsCount || 0) / payoutsLimit));

      // Paginated audit logs
      const auditFrom = (auditPage - 1) * auditLimit;
      const auditTo = auditPage * auditLimit - 1;
      const { data: logs, count: auditCount } = await supabase
        .from('wallet_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(auditFrom, auditTo);
      setAuditLogs(logs || []);
      setAuditTotalPages(Math.ceil((auditCount || 0) / auditLimit));

      if (profiles && wallets) {
        const doctorsWithWallets = profiles.map((doc: any) => {
          const wallet = wallets.find((w: any) => w.provider_id === doc.id) || { current_balance: 0, total_earned: 0, total_paid: 0, pending_balance: 0 };
          return {
            ...doc,
            doctor_id: doc.id,
            balance: Number(wallet.current_balance || 0),
            total_earned: Number(wallet.total_earned || 0),
            total_paid: Number(wallet.total_paid || 0),
            pending_balance: Number(wallet.pending_balance || 0),
          };
        });
        setDoctors(doctorsWithWallets);
      }

      // Fetch wallet ledger transactions for approval modals
      const { data: txs } = await supabase
        .from('wallet_ledger_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (txs) {
        setTransactions(txs);
      }

      // Fetch paginated payment transactions
      let payQuery = supabase
        .from('payment_transactions')
        .select('id, patient_id, amount, status, payment_type, membership_tier, payment_method, transaction_id, created_at, metadata', { count: 'exact' });

      // Apply paymentTab filter
      if (paymentTab === 'consultation') {
        payQuery = payQuery.eq('payment_type', 'consultation');
      } else if (paymentTab === 'membership') {
        payQuery = payQuery.in('payment_type', ['membership', 'combined']);
      } else if (paymentTab === 'refunds') {
        payQuery = payQuery.or('amount.lt.0,status.ilike.%refund%');
      } else if (paymentTab === 'failed') {
        payQuery = payQuery.in('status', ['failed', 'cancelled', 'declined']);
      }

      const normalizedSearch = managementSearch.trim().toLowerCase();
      if (normalizedSearch) {
        const { data: matchedPatients } = await supabase
          .from('health_assessments')
          .select('patient_id')
          .or(`full_name.ilike.%${normalizedSearch}%,first_name.ilike.%${normalizedSearch}%,last_name.ilike.%${normalizedSearch}%`);
        const patientIds = (matchedPatients || []).map((p: any) => p.patient_id);

        const orConditions = [
          `id.ilike.%${normalizedSearch}%`,
          `transaction_id.ilike.%${normalizedSearch}%`,
          `payment_type.ilike.%${normalizedSearch}%`,
          `status.ilike.%${normalizedSearch}%`
        ];
        if (patientIds.length > 0) {
          orConditions.push(`patient_id.in.(${patientIds.join(',')})`);
        }
        payQuery = payQuery.or(orConditions.join(','));
      }

      const payFrom = (paymentsPage - 1) * paymentsLimit;
      const payTo = paymentsPage * paymentsLimit - 1;

      const { data: payments, count: payCount } = await payQuery
        .order('created_at', { ascending: false })
        .range(payFrom, payTo);
      setPaymentTransactions(payments || []);
      setPaymentsTotalPages(Math.ceil((payCount || 0) / paymentsLimit));

      // Fetch monthly revenue from patient payments (unpaginated month sum query)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthStr = startOfMonth.toISOString();

      const { data: revData } = await supabase
        .from('payment_transactions')
        .select('amount')
        .in('status', ['success', 'paid', 'captured'])
        .gte('created_at', startOfMonthStr);

      const total = (revData || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      setMonthlyRevenue(total);

      // Lightweight fetch of all payment transactions to compute card KPIs correctly
      const { data: allPayData } = await supabase
        .from('payment_transactions')
        .select('status, amount, payment_type, created_at');

      const succCount = (allPayData || []).filter(p => ['success', 'paid', 'captured'].includes(String(p.status || '').toLowerCase())).length;
      const pendCount = (allPayData || []).filter(p => ['pending', 'created', 'authorized'].includes(String(p.status || '').toLowerCase())).length;
      const failCount = (allPayData || []).filter(p => ['failed', 'cancelled', 'declined'].includes(String(p.status || '').toLowerCase())).length;
      const refCount = (allPayData || []).filter(p => Number(p.amount || 0) < 0 || String(p.status || '').toLowerCase().includes('refund')).length;

      setSuccessfulPaymentsCount(succCount);
      setPendingPaymentsCount(pendCount);
      setFailedPaymentsCount(failCount);
      setRefundsCount(refCount);

      const totalRev = (allPayData || []).filter(p => ['success', 'paid', 'captured'].includes(String(p.status || '').toLowerCase())).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setTotalRevenue(totalRev);

      const todayKey = new Date().toISOString().split('T')[0];
      const todayRev = (allPayData || [])
        .filter(p => ['success', 'paid', 'captured'].includes(String(p.status || '').toLowerCase()) && p.created_at && p.created_at.split('T')[0] === todayKey)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setTodayRevenue(todayRev);

      const consultRev = (allPayData || [])
        .filter(p => ['success', 'paid', 'captured'].includes(String(p.status || '').toLowerCase()) && p.payment_type === 'consultation')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setConsultationRevenue(consultRev);

      const memberRev = (allPayData || [])
        .filter(p => ['success', 'paid', 'captured'].includes(String(p.status || '').toLowerCase()) && ['membership', 'combined'].includes(p.payment_type))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setMembershipRevenue(memberRev);

    } catch (err) {
      console.error('[Payouts Fetch Error]', err);
    }
    setPayoutLoading(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
      router.push('/');
    } catch (err) {
      console.error('[Logout Error]', err);
    }
  };

  const handleMarkAsPaid = async (txId: string, doctorName: string, amount: number) => {
    const confirmed = window.confirm(
      `Mark this ₹${amount} withdrawal request from ${doctorName || 'the doctor'} as paid?\n\nMake sure you have personally / manually sent the money to the doctor's bank account.`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('doctor_wallet_transactions')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', txId);

      if (error) {
        alert('Error updating transaction status: ' + error.message);
      } else {
        alert('Withdrawal request successfully marked as paid! ✅');
        fetchPayoutsData();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleProcessRazorpayPayout = async (payoutId: string, providerName: string, amount: number) => {
    if (!adminUser) return;
    const confirmed = window.confirm(
      `Send ₹${amount} payout to ${providerName || 'the provider'} through RazorpayX?\n\nThe payout will stay PROCESSING until RazorpayX confirms success via webhook.`
    );
    if (!confirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please log in again.');

      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ payoutId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate RazorpayX payout.');
      }
      alert(`RazorpayX payout submitted. Payout ID: ${data.payout?.id || payoutId}`);
      fetchPayoutsData();
    } catch (err: any) {
      alert('Error initiating RazorpayX payout: ' + err.message);
    }
  };

  const handleAdjustWallet = async () => {
    if (!adminUser || !adjustingProvider) return;
    const amountVal = parseFloat(adjustAmount);
    if (isNaN(amountVal) || amountVal === 0) {
      alert('Please enter a valid non-zero number for adjustment.');
      return;
    }
    if (!adjustReason.trim()) {
      alert('Please enter a reason for the adjustment.');
      return;
    }
    setAdjustSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please log in again.');

      const res = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          providerId: adjustingProvider.provider_id,
          amount: amountVal,
          reason: adjustReason.trim()
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust wallet.');
      alert('Wallet adjusted successfully! ✅');
      setShowAdjustModal(false);
      setAdjustAmount('');
      setAdjustReason('');
      setAdjustingProvider(null);
      await fetchPayoutsData();
    } catch (err: any) {
      alert('Adjustment failed: ' + err.message);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedPatient?.patient_id) {
      fetchPatientLogs(selectedPatient.patient_id, selectedPatient.weight_kg);
      fetchPatientAssignment(selectedPatient.patient_id);
    } else { 
      setPatientLogs([]); 
      setCurrentAssignment(null);
    }
  }, [selectedPatient, adminUser]);

  const fetchPatientLogs = async (userId: string, startWeight: number) => {
    const { data, error } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
      
    const startData = { day: 'Start', weight: parseFloat(startWeight as any) || 0 };
    
    if (!error && data && data.length > 0) {
      const dbData = data.map((log: any) => {
        const dateObj = new Date(log.created_at);
        const formattedDate = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;
        return { day: formattedDate, weight: parseFloat(log.weight_kg), calories: log.calories };
      });
      setPatientLogs([startData, ...dbData]);
    } else { 
      setPatientLogs([startData]); 
    }
  };

  const handlePrescription = async (type: string) => {
    if (type.toUpperCase() !== 'INJECTABLE') {
      alert('Only injectable medication is supported for new prescriptions.');
      return;
    }
    setPrescribeLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_URL}/api/prescribe`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatient.patient_id, prescription_type: type }),
      });
      
      if (response.ok) {
        alert(`Prescription for ${type} Medicine placed successfully! ✅`);
        setSelectedPatient({...selectedPatient, prescription_type: type});
        fetchPatients();
      } else {
        alert("Failed to save prescription. Please try again.");
      }
    } catch (error) {
      alert("Network Error: Could not connect to the backend server.");
      console.error("[Admin API Error]", error);
    }
    setPrescribeLoading(false);
  };

  const hasLocalFood = selectedPatient?.local_food && selectedPatient.local_food.trim().length > 0;
  const hasWorkoutPref = selectedPatient?.workout_preference && selectedPatient.workout_preference.trim().length > 0;
  const hasDietFitnessData = hasLocalFood || hasWorkoutPref;
  const activeView: AdminView =
    adminTab === 'dashboard' || adminTab === 'analytics' ? 'dashboard' :
    adminTab === 'patients' ? 'patients' :
    adminTab === 'providers' ? 'providers' :
    adminTab === 'doctors' ? 'doctors' :
    adminTab === 'appointments' || adminTab === 'video-consultations' ? 'connections' :
    adminTab === 'memberships' ? 'membership-plans' :
    adminTab === 'payments' ? 'payments' :
    adminTab === 'provider-wallets' ? 'provider-wallets' :
    adminTab === 'dietitians' || adminTab === 'nutritionists' ? 'staff' :
    'placeholder';

  const todayKey = new Date().toISOString().split('T')[0];
  const consultationRows = connections || [];
  const scheduledStatuses = ['scheduled', 'calling', 'attended'];
  const completedStatuses = ['approved', 'rejected', 'completed'];
  const cancelledStatuses = ['cancelled', 'cancelled_by_doctor', 'cancelled_by_patient'];
  const pendingStatuses = ['scheduled', 'calling', 'attended', 'pending'];
  const isDashboardTab = adminTab === 'dashboard' || adminTab === 'analytics';
  const activePatients = isDashboardTab ? dashboardSummary.activePatients : assessments.filter(patient => patient.consultation_fee_paid || patient.booking_date || patient.membership_tier).length;
  const doctorsOnline = isDashboardTab ? dashboardSummary.doctorsOnline : doctors.filter(doc => {
    if (!doc.last_seen_at) return false;
    return Date.now() - new Date(doc.last_seen_at).getTime() <= 5 * 60 * 1000;
  }).length;
  const todaysConsultations = isDashboardTab ? dashboardSummary.todaysConsultations : consultationRows.filter(c => c.booking_date === todayKey).length;
  const activeVideoCalls = isDashboardTab ? dashboardSummary.activeVideoCalls : consultationRows.filter(c => c.status === 'calling').length;
  const completedConsultations = isDashboardTab ? dashboardSummary.completedConsultations : consultationRows.filter(c => completedStatuses.includes(String(c.status || '').toLowerCase())).length;
  const pendingConsultations = isDashboardTab ? dashboardSummary.pendingConsultations : consultationRows.filter(c => pendingStatuses.includes(String(c.status || '').toLowerCase())).length;
  const missedConsultations = isDashboardTab ? dashboardSummary.missedConsultations : consultationRows.filter(c => String(c.status || '').toLowerCase() === 'missed_by_patient').length;
  const cancelledConsultations = isDashboardTab ? dashboardSummary.cancelledConsultations : consultationRows.filter(c => cancelledStatuses.includes(String(c.status || '').toLowerCase())).length;
  const platformEarnings = isDashboardTab ? dashboardSummary.platformEarnings : Math.max(
    monthlyRevenue - transactions
      .filter(tx => tx.transaction_type === 'CONSULTATION_CREDIT' && tx.status === 'SUCCESS')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    0
  );
  const goldMembers = isDashboardTab ? dashboardSummary.goldMembers : assessments.filter(patient => String(patient.membership_tier || patient.plan || '').toLowerCase().includes('gold')).length;
  const silverMembers = isDashboardTab ? dashboardSummary.silverMembers : assessments.filter(patient => String(patient.membership_tier || patient.plan || '').toLowerCase().includes('silver')).length;
  const formatDayKey = (date: Date) => date.toISOString().split('T')[0];
  const formatShortDay = (dateKey: string) => new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const last14Days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return formatDayKey(date);
  });
  const last30Days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    return formatDayKey(date);
  });
  const revenueOverviewData = last14Days.map(day => ({
    day: formatShortDay(day),
    revenue: paymentTransactions
      .filter(payment => ['success', 'paid'].includes(String(payment.status || '').toLowerCase()) && formatDayKey(new Date(payment.created_at)) === day)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
  }));
  const dailyConsultationsData = last14Days.map(day => ({
    day: formatShortDay(day),
    consultations: consultationRows.filter(c => c.booking_date === day).length,
  }));
  const membershipDistributionData = [
    { name: 'Gold', value: goldMembers, color: '#C4622D' },
    { name: 'Silver', value: silverMembers, color: '#1A1F36' },
    { name: 'Not Selected', value: Math.max(assessments.length - goldMembers - silverMembers, 0), color: '#D8E6DE' },
  ];
  const doctorWorkloadData = doctors
    .map(doc => ({
      name: doc.full_name || `Dr. ${String(doc.doctor_id || '').slice(0, 6)}`,
      consultations: consultationRows.filter(c => c.doctor_id === doc.doctor_id).length,
    }))
    .sort((a, b) => b.consultations - a.consultations)
    .slice(0, 8);
  const consultationStatusData = [
    { name: 'Pending', value: pendingConsultations, color: '#D89A3D' },
    { name: 'Completed', value: completedConsultations, color: '#5C7A6B' },
    { name: 'Missed', value: missedConsultations, color: '#B94D4D' },
    { name: 'Cancelled', value: cancelledConsultations, color: '#D96A6A' },
  ].filter(item => item.value > 0);
  const patientGrowthData = last30Days.map(day => ({
    day: formatShortDay(day),
    patients: assessments.filter(patient => patient.created_at && new Date(patient.created_at).getTime() <= new Date(`${day}T23:59:59`).getTime()).length,
  }));
  const revenueVsPayoutData = last14Days.map(day => ({
    day: formatShortDay(day),
    revenue: paymentTransactions
      .filter(payment => ['success', 'paid'].includes(String(payment.status || '').toLowerCase()) && formatDayKey(new Date(payment.created_at)) === day)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    payouts: transactions
      .filter(tx => tx.created_at && tx.type === 'CONSULTATION_PAYOUT' && formatDayKey(new Date(tx.created_at)) === day)
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
  }));
  const displayTotalPatients = isDashboardTab ? dashboardSummary.totalPatients : (assessments.length || dashboardSummary.totalPatients || 0);
  const displayTotalDoctors = isDashboardTab ? dashboardSummary.totalDoctors : (doctors.length || dashboardSummary.totalDoctors || 0);
  const patientsWaiting = isDashboardTab ? (dashboardSummary.patientsWaiting || 0) : assessments.filter(patient => patient.consultation_fee_paid && !patient.booking_date).length;
  const recentActivities = isDashboardTab ? dashboardRecentActivities : [
    ...consultationRows.map(c => ({
      id: `consultation-${c.id}`,
      at: c.created_at || `${c.booking_date || todayKey}T00:00:00`,
      title: c.status === 'approved' || c.status === 'rejected' || c.status === 'completed' ? 'Doctor completed consultation' : c.status?.includes('cancelled') ? 'Appointment cancellation' : 'Patient booking',
      detail: `${c.patient_name || 'Patient'} with ${c.doctor_name || 'assigned doctor'}${c.booking_date ? ` on ${c.booking_date}` : ''}`,
      tone: c.status?.includes('cancelled') ? 'red' : completedStatuses.includes(String(c.status || '').toLowerCase()) ? 'green' : 'orange',
    })),
    ...paymentTransactions.map(payment => ({
      id: `payment-${payment.id || payment.transaction_id}`,
      at: payment.created_at,
      title: String(payment.payment_type || '').includes('membership') ? 'Membership purchase' : Number(payment.amount || 0) < 0 ? 'Refund issued' : 'Payment received',
      detail: `${payment.membership_tier || payment.payment_type || 'Payment'} · ₹${Number(payment.amount || 0).toLocaleString('en-IN')}`,
      tone: Number(payment.amount || 0) < 0 ? 'red' : String(payment.payment_type || '').includes('membership') ? 'blue' : 'green',
    })),
    ...transactions.map(tx => ({
      id: `wallet-${tx.id}`,
      at: tx.created_at,
      title: tx.type === 'CONSULTATION_PAYOUT' ? 'Wallet payout' : tx.type === 'withdrawal' ? 'Wallet withdrawal' : 'Wallet transaction',
      detail: `Doctor wallet · ₹${Number(tx.amount || 0).toLocaleString('en-IN')} · ${tx.payout_status || tx.status || 'pending'}`,
      tone: tx.payout_status === 'FAILED' ? 'red' : 'amber',
    })),
  ]
    .filter(activity => activity.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);
  const liveOperations = [
    { label: 'Doctors Online', value: doctorsOnline, icon: Stethoscope, tone: 'green' },
    { label: 'Active Video Calls', value: activeVideoCalls, icon: Video, tone: 'orange' },
    { label: 'Patients Waiting', value: patientsWaiting, icon: Users, tone: 'amber' },
    { label: "Today's Appointments", value: todaysConsultations, icon: Calendar, tone: 'blue' },
    { label: 'Missed Consultations', value: missedConsultations, icon: AlertCircle, tone: 'red' },
    { label: 'Cancelled Consultations', value: cancelledConsultations, icon: XCircle, tone: 'red' },
  ];
  const normalizedSearch = managementSearch.trim().toLowerCase();
  const getPatientName = (patient: any) => patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
  const getPatientMembership = (patient: any) => String(patient.membership_tier || patient.plan || 'Not Selected');
  const filteredPatients = assessments.filter(patient => {
    const name = getPatientName(patient).toLowerCase();
    const matchesSearch = !normalizedSearch || name.includes(normalizedSearch) || String(patient.phone_number || '').includes(normalizedSearch);
    const matchesEligibility = eligibilityFilter === 'all' || String(Boolean(patient.is_eligible)) === eligibilityFilter;
    const membership = getPatientMembership(patient).toLowerCase();
    const matchesMembership = membershipFilter === 'all' || membership.includes(membershipFilter);
    const isPaid = Boolean(patient.consultation_fee_paid);
    const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' ? isPaid : !isPaid);
    const hasAppointment = Boolean(patient.booking_date || patient.booking_time);
    const matchesAppointment = appointmentFilter === 'all' || (appointmentFilter === 'scheduled' ? hasAppointment : !hasAppointment);
    return matchesSearch && matchesEligibility && matchesMembership && matchesPayment && matchesAppointment;
  });
  const filteredDoctors = doctors.filter(doc => {
    const text = `${doc.full_name || ''} ${doc.specialty || ''} ${doc.specialization || ''}`.toLowerCase();
    return !normalizedSearch || text.includes(normalizedSearch);
  });
  const filteredAppointments = consultationRows.filter(item => {
    const text = `${item.patient_name || ''} ${item.doctor_name || ''} ${item.status || ''} ${item.booking_date || ''}`.toLowerCase();
    const matchesSearch = !normalizedSearch || text.includes(normalizedSearch);
    const status = String(item.status || '').toLowerCase();
    const matchesStatus = appointmentFilter === 'all' || status === appointmentFilter;
    return matchesSearch && matchesStatus;
  });
  const consultationPayments = paymentTransactions.filter(payment => payment.payment_type === 'consultation');
  const membershipPayments = paymentTransactions.filter(payment => ['membership', 'combined'].includes(payment.payment_type));
  const refunds = paymentTransactions.filter(payment => Number(payment.amount || 0) < 0 || String(payment.status || '').toLowerCase().includes('refund'));
  const razorpayTransactions = paymentTransactions.filter(payment => String(payment.payment_provider || '').toLowerCase().includes('razorpay'));
  const successfulPayments = paymentTransactions.filter(payment => ['success', 'paid', 'captured'].includes(String(payment.status || '').toLowerCase()));
  const pendingPayments = paymentTransactions.filter(payment => ['pending', 'created', 'authorized'].includes(String(payment.status || '').toLowerCase()));
  const failedPayments = paymentTransactions.filter(payment => ['failed', 'cancelled', 'declined'].includes(String(payment.status || '').toLowerCase()));
  const paymentRows = paymentTransactions.filter(payment => {
    const status = String(payment.status || '').toLowerCase();
    const type = String(payment.payment_type || '').toLowerCase();
    const matchesTab =
      paymentTab === 'all' ||
      (paymentTab === 'consultation' && type === 'consultation') ||
      (paymentTab === 'membership' && ['membership', 'combined'].includes(type)) ||
      (paymentTab === 'refunds' && (Number(payment.amount || 0) < 0 || status.includes('refund'))) ||
      (paymentTab === 'failed' && ['failed', 'cancelled', 'declined'].includes(status));
    const patient = assessments.find(item => item.patient_id === payment.patient_id || item.id === payment.patient_id);
    const text = `${payment.id || ''} ${payment.transaction_id || ''} ${payment.payment_type || ''} ${payment.status || ''} ${patient ? getPatientName(patient) : ''}`.toLowerCase();
    return matchesTab && (!normalizedSearch || text.includes(normalizedSearch));
  });
  const providerRoles = ['doctor', 'dietitian', 'nutritionist', 'fitness_coach'];
  const providerRows = [
    ...providers.map(provider => {
      const wallet = doctors.find(doc => doc.doctor_id === provider.provider_id) || {};
      return {
        ...provider,
        provider_id: provider.provider_id,
        name: provider.full_name || provider.email || 'Provider',
        specialization: provider.specialization || 'Clinical support',
        balance: Number(wallet.balance || 0),
        pending_balance: Number(wallet.pending_balance || 0),
        total_paid: Number(wallet.total_paid || 0),
        total_earned: Number(wallet.total_earned || 0),
      };
    }),
    ...doctors
      .filter(doc => !providers.some(provider => provider.provider_id === doc.doctor_id))
      .map(doc => ({
        ...doc,
        role: 'doctor',
        provider_id: doc.doctor_id,
        name: doc.full_name || 'Doctor',
        specialization: doc.specialty || doc.specialization || 'Endocrinology',
        balance: Number(doc.balance || 0),
        pending_balance: Number(doc.pending_balance || 0),
        total_paid: Number(doc.total_paid || 0),
        total_earned: Number(doc.total_earned || 0),
      })),
    ...allStaff
      .filter(staff => providerRoles.includes(String(staff.role || '').toLowerCase()) && !doctors.some(doc => doc.doctor_id === staff.id) && !providers.some(provider => provider.provider_id === staff.id))
      .map(staff => {
        const wallet = doctors.find(doc => doc.doctor_id === staff.id) || {};
        return {
          ...staff,
          provider_id: staff.id,
          name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email || 'Provider',
          specialization: staff.specialization || staff.role || 'Clinical support',
          balance: Number(wallet.balance || 0),
          pending_balance: Number(wallet.pending_balance || 0),
          total_paid: Number(wallet.total_paid || 0),
          total_earned: Number(wallet.total_earned || 0),
        };
      }),
  ].filter(provider => {
    const role = String(provider.role || '').toLowerCase();
    const pending = providerPayouts.some(p => p.provider_id === provider.provider_id && (p.payout_status === 'PENDING' || p.payout_status === 'PROCESSING'));
    const failed = providerPayouts.some(p => p.provider_id === provider.provider_id && p.payout_status === 'FAILED');
    const paid = providerPayouts.some(p => p.provider_id === provider.provider_id && p.payout_status === 'COMPLETED');
    const matchesFilter =
      providerFilter === 'all' ||
      providerFilter === role ||
      (providerFilter === 'pending' && pending) ||
      (providerFilter === 'paid' && paid) ||
      (providerFilter === 'failed' && failed);
    const text = `${provider.name || ''} ${provider.role || ''} ${provider.specialization || ''}`.toLowerCase();
    return matchesFilter && (!normalizedSearch || text.includes(normalizedSearch));
  });

  const paginatedProviderRows = providerRows.slice((providersPage - 1) * providersLimit, providersPage * providersLimit);
  const providersTotalPages = Math.ceil(providerRows.length / providersLimit) || 1;
  const processedPayouts = providerPayouts
    .filter(p => p.payout_status === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.payout_amount || 0), 0);
  const failedPayouts = providerPayouts.filter(p => p.payout_status === 'FAILED').length;
  const walletBalance = providerRows.reduce((sum, provider) => sum + Number(provider.balance || 0), 0);
  const pendingPayouts = providerPayouts
    .filter(p => p.payout_status === 'PENDING' || p.payout_status === 'PROCESSING')
    .reduce((sum, p) => sum + Number(p.payout_amount || 0), 0);
  const providersAwaitingSettlement = providerRows.filter(provider => 
    providerPayouts.some(p => p.provider_id === provider.provider_id && p.payout_status === 'PENDING')
  ).length;

  const membershipMembers = assessments.filter(patient => ['gold', 'silver'].some(plan => getPatientMembership(patient).toLowerCase().includes(plan)));
  const newMembershipsThisMonth = membershipMembers.filter(patient => patient.created_at && new Date(patient.created_at).getTime() >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()).length;
  const conversionRate = displayTotalPatients ? Math.round((membershipMembers.length / displayTotalPatients) * 100) : 0;

  const navSections = [
    { title: 'Dashboard', items: [{ id: 'dashboard', label: 'Dashboard', icon: HomeIcon }] },
    {
      title: 'User Management',
      items: [
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'providers', label: 'Providers', icon: Stethoscope },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'appointments', label: 'Appointments', icon: Calendar },
        { id: 'video-consultations', label: 'Video Consultations', icon: Video },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'provider-wallets', label: 'Provider Wallets', icon: Wallet },
      ],
    },
    {
      title: 'Business',
      items: [
        { id: 'memberships', label: 'Membership Plans', icon: BadgeCheck },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'reports', label: 'Reports', icon: FileText },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'notifications', label: 'Notifications', icon: AlertCircle },
        { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
        { id: 'platform-settings', label: 'Platform Settings', icon: GitMerge },
      ],
    },
  ];

  const placeholderTitles: Record<string, string> = {
    reports: 'Reports',
    notifications: 'Notifications',
    'audit-logs': 'Audit Logs',
    'platform-settings': 'Platform Settings',
    'admin-profile': 'Admin Profile',
  };
  const settingsGroups = [
    {
      title: 'Commercial Rules',
      description: 'Pricing, payouts, and margin controls for the first consultation and care team payouts.',
      items: [
        { label: 'Consultation Fee', value: 'Rs 499', helper: 'Initial endocrinologist consultation charged to patients.' },
        { label: 'Doctor Payout', value: 'Rs 300', helper: 'Credited only after completed attended consultation.' },
        { label: 'Dietitian Payout', value: 'Configure', helper: 'Used for post-plan care team compensation.' },
        { label: 'Nutritionist Payout', value: 'Configure', helper: 'Applied to nutrition support sessions.' },
        { label: 'Fitness Coach Payout', value: 'Configure', helper: 'Applied to fitness coach sessions.' },
        { label: 'Platform Commission', value: 'Rs 199', helper: 'Consultation fee minus doctor payout.' },
      ],
    },
    {
      title: 'Integrations',
      description: 'Operational services used for payments, video consultation, and outbound communication.',
      items: [
        { label: 'SMTP', value: 'Email delivery', helper: 'Host, port, sender identity, and transactional email credentials.' },
        { label: 'Razorpay', value: 'Payments + RazorpayX', helper: 'Patient collections, refunds, doctor payouts, and webhooks.' },
        { label: 'Jitsi', value: 'Video provider', helper: 'Meeting room provider for patient-doctor consultations.' },
      ],
    },
    {
      title: 'Notification Templates',
      description: 'Reusable message templates for appointments, payments, plans, and operational alerts.',
      items: [
        { label: 'Booking Confirmed', value: 'Patient + Doctor', helper: 'Appointment details, receipt link, and calendar prompt.' },
        { label: 'Join Reminder', value: '15 minutes before', helper: 'Sent before Jitsi join access opens.' },
        { label: 'Plan Selection', value: 'Post consultation', helper: 'Prompt after doctor completes the consultation.' },
        { label: 'Payout Update', value: 'Doctor', helper: 'Wallet credit, RazorpayX processing, and payout status changes.' },
      ],
    },
  ];
  const reportCards = [
    { title: 'Revenue Report', metric: `Rs ${monthlyRevenue.toLocaleString('en-IN')}`, detail: 'Collections, refunds, plan revenue, and platform earnings.', icon: Wallet, tone: 'blue' },
    { title: 'Consultation Report', metric: consultationRows.length || todaysConsultations, detail: 'Scheduled, completed, missed, cancelled, and active consultations.', icon: Calendar, tone: 'orange' },
    { title: 'Doctor Performance', metric: displayTotalDoctors, detail: 'Assigned cases, completion rate, no-shows, and payout readiness.', icon: Stethoscope, tone: 'green' },
    { title: 'Membership Report', metric: goldMembers + silverMembers, detail: 'Gold, Silver, conversion rate, and membership payment health.', icon: BadgeCheck, tone: 'amber' },
    { title: 'Patient Growth', metric: displayTotalPatients, detail: 'New patients, eligibility funnel, and active patient progression.', icon: TrendingUp, tone: 'red' },
  ];
  const notificationCards = [
    { title: 'Broadcast Email', audience: 'All eligible users', detail: 'Send campaign or operational email through SMTP templates.', icon: FileText, tone: 'blue' },
    { title: 'Push Notifications', audience: 'Mobile and web', detail: 'Appointment reminders, plan prompts, and status alerts.', icon: AlertCircle, tone: 'orange' },
    { title: 'SMS', audience: 'High priority', detail: 'Payment, booking, cancellation, and join reminders.', icon: PhoneOff, tone: 'amber' },
    { title: 'Patient-only', audience: `${displayTotalPatients} patients`, detail: 'Target onboarding, appointment, plan, and receipt messages.', icon: Users, tone: 'green' },
    { title: 'Doctor-only', audience: `${displayTotalDoctors} doctors`, detail: 'Target consultation, wallet, payout, and schedule updates.', icon: Stethoscope, tone: 'red' },
  ];
  const auditLogRows = [
    ...recentActivities.map(activity => ({
      id: activity.id,
      category: activity.title.includes('Payment') || activity.title.includes('purchase') || activity.title.includes('Refund') ? 'Payments' :
        activity.title.includes('booking') || activity.title.includes('consultation') || activity.title.includes('cancellation') ? 'Appointments' :
        activity.title.includes('Wallet') ? 'Doctor actions' : 'Admin actions',
      event: activity.title,
      actor: 'System',
      detail: activity.detail,
      at: activity.at,
      tone: activity.tone,
    })),
    { id: 'audit-login', category: 'Login', event: 'Admin session verified', actor: adminUser?.email || 'Admin', detail: 'Secure admin portal access granted.', at: new Date().toISOString(), tone: 'blue' },
    { id: 'audit-settings', category: 'System settings changes', event: 'Settings module opened', actor: adminUser?.email || 'Admin', detail: 'Platform configuration is available for controlled updates.', at: new Date().toISOString(), tone: 'amber' },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 18);
  const kpiCards = [
    { label: 'Total Patients', value: displayTotalPatients, icon: Users, tone: 'orange' },
    { label: 'Active Patients', value: activePatients, icon: UserCheck, tone: 'green' },
    { label: 'Total Doctors', value: displayTotalDoctors, icon: Stethoscope, tone: 'blue' },
    { label: 'Doctors Online', value: doctorsOnline, icon: Activity, tone: 'green' },
    { label: "Today's Consultations", value: todaysConsultations, icon: Calendar, tone: 'amber' },
    { label: 'Active Video Calls', value: activeVideoCalls, icon: Video, tone: 'orange' },
    { label: 'Completed Consultations', value: completedConsultations, icon: CheckCircle2, tone: 'green' },
    { label: 'Pending Consultations', value: pendingConsultations, icon: Clock, tone: 'amber' },
    { label: 'Missed Consultations', value: missedConsultations, icon: AlertCircle, tone: 'red' },
    { label: 'Cancelled Consultations', value: cancelledConsultations, icon: XCircle, tone: 'red' },
    { label: 'Monthly Revenue', value: `₹${monthlyRevenue.toLocaleString('en-IN')}`, icon: Wallet, tone: 'blue' },
    { label: 'Platform Earnings', value: `₹${platformEarnings.toLocaleString('en-IN')}`, icon: TrendingUp, tone: 'green' },
    { label: 'Pending Payouts', value: `₹${pendingPayouts.toLocaleString('en-IN')}`, icon: DollarSign, tone: 'amber' },
    { label: 'Gold Members', value: goldMembers, icon: BadgeCheck, tone: 'orange' },
    { label: 'Silver Members', value: silverMembers, icon: ShieldCheck, tone: 'blue' },
  ];
  const toneClasses: Record<string, string> = {
    orange: 'bg-[#C4622D]/10 text-[#C4622D]',
    green: 'bg-[#5C7A6B]/12 text-[#5C7A6B]',
    amber: 'bg-[#D89A3D]/12 text-[#B7792F]',
    red: 'bg-[#D96A6A]/12 text-[#B94D4D]',
    blue: 'bg-[#1A1F36]/8 text-[#1A1F36]',
  };

  if (authChecking) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-black text-slate-300 mt-6 tracking-wide">Verifying credentials...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-955 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-8 h-8"/>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Security Alert</h3>
            <p className="text-slate-400 text-sm font-semibold mt-3 leading-relaxed">{authError}</p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 text-sm"
            >
              Go to Homepage
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-6 rounded-2xl text-sm transition-all"
            >
              Logout / Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="w-8 h-8 border-4 border-violet-100 border-t-violet-500 rounded-full animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 direction-reverse"></div>
        </div>
        <p className="text-lg font-black text-slate-600 mt-6 tracking-wide">Loading Admin System...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F0EB] overflow-hidden font-sans text-[#1A1F36] selection:bg-[#C4622D]/15 selection:text-[#1A1F36] relative">
      
      {/* ── BACKGROUND DECORATIONS ── */}

      {/* ── LEFT SIDEBAR ── */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[272px] shrink-0 bg-[#1A1F36] text-white border-r border-[#1A1F36] flex flex-col shadow-[10px_0_30px_rgba(26,31,54,0.18)] z-20"
      >
        <div className="p-5 border-b border-white/10 bg-[#11162A]">
          <h1 className="text-xl font-black tracking-tight flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-[#C4622D]"/> 8liv Admin</h1>
          <p className="text-[#D8E6DE] text-xs mt-2 font-black tracking-[0.18em] uppercase">Healthcare Operations Center</p>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 flex flex-col py-4 px-3 gap-4 overflow-y-auto custom-scrollbar">
          {navSections.map((section, sectionIndex) => (
            <div key={section.title || sectionIndex} className="space-y-1">
              {section.title && (
                <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#D8E6DE]/60">{section.title}</p>
              )}
              {section.items.map(item => {
                const isActive = adminTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      openAdminTab(item.id as AdminTab);
                      setSelectedPatient(null);
                      if (item.id === 'doctors') setSelectedDoctor(null);
                      if (item.id === 'appointments' || item.id === 'video-consultations') { setSelectedConnection(null); fetchConnections(); }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all rounded-xl border-l-4 ${
                      isActive
                        ? 'bg-[#F5F0EB] text-[#1A1F36] border-[#C4622D] shadow-sm'
                        : 'border-transparent text-white/75 hover:bg-white/8 hover:text-white hover:border-[#C4622D]/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#C4622D]' : 'text-[#D8E6DE]'}`} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-[#11162A]">
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C4622D] to-[#D89A3D] text-sm font-black text-white">
              {(adminUser?.email || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{adminUser?.email?.split('@')[0] || 'Admin'}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D8E6DE]/70">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => setAdminTab('platform-settings')}
            className="mb-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white/85 hover:bg-white/8 hover:text-white transition-colors border border-white/10"
          >
            <GitMerge className="w-4 h-4"/> Settings
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white hover:bg-[#D96A6A]/20 hover:text-white transition-colors border border-white/10"
          >
            <LogOut className="w-4 h-4"/> Logout
          </button>
        </div>
      </motion.div>

      {/* ── RIGHT MAIN AREA ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex-1 overflow-y-auto relative z-10 custom-scrollbar bg-[#F5F0EB]"
      >
        {activeCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-slate-950 flex flex-col">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center shadow-2xl border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)]"></span>
                </div>
                <h2 className="text-xl font-black tracking-wide">Live {activeCall} Session <span className="text-slate-500 font-medium">|</span> {selectedPatient?.first_name || selectedPatient?.last_name ? `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim() : 'Member'}</h2>
              </div>
              <button onClick={() => setActiveCall(null)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-rose-600/30 active:scale-95"><PhoneOff className="w-5 h-5"/> End Session</button>
            </div>
            <div className="flex-1 w-full bg-slate-900 p-6 flex items-center justify-center">
              <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl text-center space-y-6 text-white">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
                  <Video className="w-8 h-8 text-white"/>
                </div>

                <div>
                  <h3 className="text-2xl font-black tracking-tight">Google Meet Call Ready</h3>
                  <p className="text-slate-400 text-sm font-semibold mt-2">Click the button below to join the Google Meet session for the <strong>{activeCall} View</strong>.</p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl text-left border border-slate-700/50">
                  <p className="text-xs font-bold text-indigo-300">⚡ Google Meet will open in a new browser tab. Please keep this dashboard window open to manage the patient's record after the meeting.</p>
                </div>

                <div className="pt-2">
                  <a
                    href={selectedPatient?.room_url || "https://meet.google.com/abc-defg-hij"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95"
                  >
                    <Video className="w-5 h-5"/> Launch Google Meet
                  </a>
                </div>

                <div className="border-t border-slate-800 pt-6">
                  <button
                    onClick={() => setActiveCall(null)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all"
                  >
                    Close Session Panel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'patients' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">User Management</p>
                <h2 className="text-3xl font-black text-[#1A1F36]">Patients</h2>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 lg:min-w-[900px]">
                <input value={managementSearch} onChange={e => handleSearchChange(e.target.value)} placeholder="Search patients..." className="sm:col-span-2 rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C4622D]/20" />
                <select value={eligibilityFilter} onChange={e => { setEligibilityFilter(e.target.value); setPatientsPage(1); }} className="rounded-xl border border-[#1A1F36]/10 bg-white px-3 py-3 text-sm font-bold"><option value="all">Eligibility</option><option value="true">Eligible</option><option value="false">Not Eligible</option></select>
                <select value={membershipFilter} onChange={e => { setMembershipFilter(e.target.value); setPatientsPage(1); }} className="rounded-xl border border-[#1A1F36]/10 bg-white px-3 py-3 text-sm font-bold"><option value="all">Membership</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="not selected">Not Selected</option></select>
                <select value={paymentFilter} onChange={e => { setPaymentFilter(e.target.value); setPatientsPage(1); }} className="rounded-xl border border-[#1A1F36]/10 bg-white px-3 py-3 text-sm font-bold"><option value="all">Payment</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Total Patients', value: patientsCount, helper: 'Complete member roster', icon: Users, tone: 'blue' },
                { label: 'Eligible', value: eligibleCount, helper: 'Approved assessment', icon: ShieldCheck, tone: 'green' },
                { label: 'Paid Consultation', value: paidCount, helper: 'Rs 499 received', icon: Wallet, tone: 'orange' },
                { label: 'Appointments', value: appointmentCount, helper: 'Booked slots', icon: Calendar, tone: 'amber' },
                { label: 'Progress Logged', value: progressCount, helper: 'Weight goal present', icon: TrendingUp, tone: 'red' },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                    <div className={`mb-4 inline-flex rounded-2xl p-3 ${toneClasses[card.tone]}`}><Icon className="h-5 w-5" /></div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#8896A4]">{card.label}</p>
                    <p className="mt-2 text-3xl font-black text-[#1A1F36]">{card.value}</p>
                    <p className="mt-1 text-xs font-bold text-[#40516A]">{card.helper}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#1A1F36]">Patient Roster Operations</p>
                <p className="mt-1 text-sm font-semibold text-[#8896A4]">Export the filtered roster and review eligibility, payment, appointments, and progress inside this page.</p>
              </div>
              <a
                href={`/api/admin/reports?adminId=${adminUser?.id}&format=csv`}
                download="8liv_patients_report.csv"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#11162A]"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Export Patient Roster
              </a>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-[#1A1F36]/8 bg-white shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr] gap-4 border-b border-[#1A1F36]/8 bg-[#F5F0EB] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#8896A4]">
                <span>Patient</span><span>Eligibility</span><span>Membership</span><span>Assigned Doctor</span><span>Payment</span><span>Progress</span>
              </div>
              <div className="divide-y divide-[#1A1F36]/8">
                {filteredPatients.map(patient => {
                  const assignmentDoctor = allStaff.find(staff => staff.id === currentAssignment?.doctor_id);
                  return (
                    <div key={patient.id} className="grid grid-cols-1 gap-3 px-5 py-4 text-sm font-bold text-[#40516A] md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr] md:items-center">
                      <div><p className="font-black text-[#1A1F36]">{getPatientName(patient)}</p><p className="text-xs text-[#8896A4]">{patient.phone_number || patient.patient_id}</p></div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${patient.is_eligible ? 'bg-[#5C7A6B]/12 text-[#5C7A6B]' : 'bg-[#D96A6A]/12 text-[#B94D4D]'}`}>{patient.is_eligible ? 'Eligible' : 'Not Eligible'}</span>
                      <span>{getPatientMembership(patient)}</span>
                      <span>{assignmentDoctor ? `${assignmentDoctor.first_name} ${assignmentDoctor.last_name}` : 'Auto Assigned'}</span>
                      <span className={patient.consultation_fee_paid ? 'text-[#5C7A6B]' : 'text-[#B7792F]'}>{patient.consultation_fee_paid ? 'Paid' : 'Pending'}</span>
                      <span>{patient.weight_kg && patient.goal_weight_kg ? `${patient.weight_kg} → ${patient.goal_weight_kg} kg` : 'Not logged'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#1A1F36]/8 pt-4">
              <p className="text-xs font-semibold text-[#8896A4]">
                Showing Page {patientsPage} of {patientsTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={patientsPage === 1}
                  onClick={() => setPatientsPage(prev => Math.max(prev - 1, 1))}
                  className="rounded-xl border border-[#1A1F36]/10 px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={patientsPage === patientsTotalPages}
                  onClick={() => setPatientsPage(prev => Math.min(prev + 1, patientsTotalPages))}
                  className="rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        ) : activeView === 'providers' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">User Management</p>
                <h2 className="text-3xl font-black text-[#1A1F36]">Providers</h2>
                <p className="mt-2 text-sm font-semibold text-[#8896A4]">Add, edit, activate, deactivate, and manage all healthcare providers from one reusable system.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input value={managementSearch} onChange={e => handleSearchChange(e.target.value)} placeholder="Search providers..." className="min-w-[260px] rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C4622D]/20" />
                <select value={providerFilter} onChange={e => { setProviderFilter(e.target.value); setProvidersPage(1); }} className="rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-bold">
                  <option value="all">All Roles</option>
                  <option value="doctor">Doctor</option>
                  <option value="dietitian">Dietitian</option>
                  <option value="nutritionist">Nutritionist</option>
                  <option value="fitness_coach">Fitness Coach</option>
                </select>
                <button onClick={resetProviderForm} className="rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Add Provider</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Total Providers', value: providers.length, icon: Users, tone: 'blue' },
                { label: 'Doctors', value: providers.filter(p => p.role === 'doctor').length, icon: Stethoscope, tone: 'green' },
                { label: 'Dietitians', value: providers.filter(p => p.role === 'dietitian').length, icon: Apple, tone: 'amber' },
                { label: 'Nutritionists', value: providers.filter(p => p.role === 'nutritionist').length, icon: Pill, tone: 'orange' },
                { label: 'Fitness Coaches', value: providers.filter(p => p.role === 'fitness_coach').length, icon: Dumbbell, tone: 'red' },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                    <div className={`mb-4 inline-flex rounded-2xl p-3 ${toneClasses[card.tone]}`}><Icon className="h-5 w-5" /></div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#8896A4]">{card.label}</p>
                    <p className="mt-2 text-3xl font-black text-[#1A1F36]">{card.value}</p>
                  </div>
                );
              })}
            </div>
            {providersWarning && (
              <div className="rounded-[20px] border border-[#D89A3D]/25 bg-[#D89A3D]/10 p-5 text-sm font-bold text-[#B7792F]">
                {providersWarning}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
              <div className="overflow-hidden rounded-[20px] border border-[#1A1F36]/8 bg-white shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <div className="grid min-w-[1100px] grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_1.1fr] gap-4 bg-[#F5F0EB] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#8896A4]">
                  <span>Provider</span><span>Role</span><span>Specialization</span><span>Experience</span><span>Payout</span><span>Status</span><span>Wallet</span><span>Actions</span>
                </div>
                <div className="overflow-x-auto divide-y divide-[#1A1F36]/8">
                  {providerRows.length === 0 ? (
                    <div className="p-10 text-center text-sm font-bold text-[#8896A4]">
                      <p>No providers found. Add the first provider to enable assignment and wallets.</p>
                      <button onClick={resetProviderForm} className="mt-4 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Add Provider</button>
                    </div>
                  ) : paginatedProviderRows.map(provider => (
                    <div key={provider.provider_id} className="grid min-w-[1100px] grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_1.1fr] gap-4 px-5 py-4 text-sm font-bold text-[#40516A]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C4622D] to-[#D89A3D] text-sm font-black text-white">{String(provider.name || 'P').slice(0, 1)}</div>
                        <div><p className="font-black text-[#1A1F36]">{provider.name}</p><p className="text-xs text-[#8896A4]">{provider.email || provider.phone_number || provider.provider_id}</p></div>
                      </div>
                      <span className="capitalize">{String(provider.role || '').replace('_', ' ')}</span>
                      <span>{provider.specialization || 'Not set'}</span>
                      <span>{provider.years_experience || provider.yearsExperience || 0} yrs</span>
                      <span>Rs {Number(provider.payout_amount || provider.payoutAmount || 0).toLocaleString('en-IN')}</span>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${provider.status === 'inactive' ? 'bg-[#D96A6A]/12 text-[#B94D4D]' : 'bg-[#5C7A6B]/12 text-[#5C7A6B]'}`}>{provider.status || 'active'}</span>
                      <span>Included</span>
                      <span className="flex flex-wrap gap-2">
                        <button onClick={() => editProvider(provider)} className="rounded-lg border border-[#1A1F36]/10 px-2 py-1 text-[10px] font-black">Edit</button>
                        <button onClick={() => handleProviderStatus(provider, provider.status === 'inactive' ? 'active' : 'inactive')} className="rounded-lg bg-[#1A1F36] px-2 py-1 text-[10px] font-black text-white">{provider.status === 'inactive' ? 'Activate' : 'Deactivate'}</button>
                        <button onClick={() => { setManagementSearch(provider.name || ''); openAdminTab('appointments'); }} className="rounded-lg border border-[#1A1F36]/10 px-2 py-1 text-[10px] font-black">Schedule</button>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-[#1A1F36]/8">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#8896A4]">
                      Showing Page {providersPage} of {providersTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={providersPage === 1}
                        onClick={() => setProvidersPage(prev => Math.max(prev - 1, 1))}
                        className="rounded-xl border border-[#1A1F36]/10 px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        disabled={providersPage === providersTotalPages}
                        onClick={() => setProvidersPage(prev => Math.min(prev + 1, providersTotalPages))}
                        className="rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateProvider} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">{selectedProvider ? 'Edit Provider' : 'Add Provider'}</p>
                  <h3 className="mt-1 text-2xl font-black text-[#1A1F36]">{selectedProvider ? 'Provider Profile' : 'Provider Login + Profile'}</h3>
                  <p className="mt-2 text-sm font-semibold text-[#8896A4]">Creates login access, provider profile, wallet inclusion, and schedule eligibility.</p>
                </div>
                <div className="space-y-4">
                  <input value={providerFullName} onChange={e => setProviderFullName(e.target.value)} placeholder="Full Name *" className="w-full rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input value={providerEmail} onChange={e => setProviderEmail(e.target.value)} placeholder="Email *" className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                    <input value={providerPassword} onChange={e => setProviderPassword(e.target.value)} placeholder="Temporary Password *" type="password" className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  </div>
                  <input value={providerPhone} onChange={e => setProviderPhone(e.target.value)} placeholder="Phone Number" className="w-full rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select value={providerRole} onChange={e => { const role = e.target.value as typeof providerRole; setProviderRole(role); setProviderSpecialization(providerSpecializationOptions[role][0]); }} className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none">
                      <option value="doctor">Doctor</option>
                      <option value="dietitian">Dietitian</option>
                      <option value="nutritionist">Nutritionist</option>
                      <option value="fitness_coach">Fitness Coach</option>
                    </select>
                    <select value={providerSpecialization} onChange={e => setProviderSpecialization(e.target.value)} className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none">
                      {providerSpecializationOptions[providerRole].map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input value={providerQualification} onChange={e => setProviderQualification(e.target.value)} placeholder="Qualification" className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                    <input value={providerExperience} onChange={e => setProviderExperience(e.target.value)} placeholder="Years of Experience" type="number" className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  </div>
                  <input value={providerLicense} onChange={e => setProviderLicense(e.target.value)} placeholder="Medical License / Registration Number" className="w-full rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  <input value={providerPhoto} onChange={e => setProviderPhoto(e.target.value)} placeholder="Profile Photo URL" className="w-full rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input value={providerConsultationType} onChange={e => setProviderConsultationType(e.target.value)} placeholder="Consultation Type" className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                    <input value={providerPayoutAmount} onChange={e => setProviderPayoutAmount(e.target.value)} placeholder="Payout Amount" type="number" className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  </div>
                  <select value={providerStatus} onChange={e => setProviderStatus(e.target.value as 'active' | 'inactive')} className="w-full rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <textarea value={providerBankDetails} onChange={e => setProviderBankDetails(e.target.value)} placeholder="Bank Account Details" rows={3} className="w-full rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  <input value={providerUpi} onChange={e => setProviderUpi(e.target.value)} placeholder="UPI ID" className="w-full rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-4 py-3 text-sm font-bold outline-none" />
                  <button disabled={providerSubmitting} className="w-full rounded-xl bg-[#1A1F36] px-5 py-4 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-[#11162A] disabled:opacity-60">
                    {providerSubmitting ? 'Saving Provider...' : selectedProvider ? 'Save Provider' : 'Create Provider'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : activeView === 'doctors' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">User Management</p><h2 className="text-3xl font-black text-[#1A1F36]">Doctors</h2></div>
              <input value={managementSearch} onChange={e => handleSearchChange(e.target.value)} placeholder="Search doctors..." className="w-full max-w-md rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C4622D]/20" />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredDoctors.map(doc => {
                const online = doc.last_seen_at && Date.now() - new Date(doc.last_seen_at).getTime() <= 5 * 60 * 1000;
                const todays = consultationRows.filter(c => c.doctor_id === doc.doctor_id && c.booking_date === todayKey).length;
                const completed = consultationRows.filter(c => c.doctor_id === doc.doctor_id && completedStatuses.includes(String(c.status || '').toLowerCase())).length;
                return (
                  <div key={doc.doctor_id} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C4622D] to-[#D89A3D] text-xl font-black text-white">{(doc.full_name || 'D').slice(0, 1)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-[#1A1F36]">{doc.full_name || 'Doctor'}</h3><p className="text-sm font-bold text-[#8896A4]">{doc.specialty || doc.specialization || 'Endocrinology'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${online ? 'bg-[#5C7A6B]/12 text-[#5C7A6B]' : 'bg-[#8896A4]/15 text-[#40516A]'}`}>{online ? 'Online' : 'Offline'}</span></div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-bold text-[#40516A] sm:grid-cols-4">
                          <div><p className="text-[10px] uppercase text-[#8896A4]">Availability</p><p>Configured</p></div>
                          <div><p className="text-[10px] uppercase text-[#8896A4]">Wallet</p><p>₹{Number(doc.balance || 0).toLocaleString('en-IN')}</p></div>
                          <div><p className="text-[10px] uppercase text-[#8896A4]">Today</p><p>{todays}</p></div>
                          <div><p className="text-[10px] uppercase text-[#8896A4]">Completed</p><p>{completed}</p></div>
                        </div>
                        <div className="mt-4 flex gap-2"><button onClick={() => { setManagementSearch(doc.full_name || ''); openAdminTab('providers'); }} className="rounded-xl border border-[#1A1F36]/10 px-4 py-2 text-xs font-black text-[#1A1F36]">Edit</button><button onClick={() => handleProviderStatus({ provider_id: doc.doctor_id }, 'inactive')} className="rounded-xl bg-[#D96A6A]/12 px-4 py-2 text-xs font-black text-[#B94D4D]">Deactivate</button></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : activeView === 'connections' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">{adminTab === 'video-consultations' ? 'Video Consultations' : 'Appointments'}</p><h2 className="text-3xl font-black text-[#1A1F36]">{adminTab === 'video-consultations' ? 'Video Consultation Monitor' : 'Appointment Management'}</h2></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:min-w-[520px]"><input value={managementSearch} onChange={e => handleSearchChange(e.target.value)} placeholder="Search doctor or patient..." className="rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-bold outline-none" /><select value={appointmentFilter} onChange={e => { setAppointmentFilter(e.target.value); setConnectionsPage(1); }} className="rounded-xl border border-[#1A1F36]/10 bg-white px-3 py-3 text-sm font-bold"><option value="all">All Statuses</option><option value="scheduled">Scheduled</option><option value="calling">Calling</option><option value="attended">Attended</option><option value="approved">Completed</option><option value="missed_by_patient">Missed</option><option value="cancelled_by_doctor">Cancelled</option></select></div>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-[#1A1F36]/8 bg-white shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
              <div className="grid grid-cols-[1fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-4 border-b border-[#1A1F36]/8 bg-[#F5F0EB] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#8896A4]"><span>Patient</span><span>Doctor</span><span>Status</span><span>Payment</span><span>Meeting</span><span>Duration</span><span>Date</span></div>
              <div className="divide-y divide-[#1A1F36]/8">
                {filteredAppointments.map(item => (
                  <div key={item.id} className="grid grid-cols-1 gap-3 px-5 py-4 text-sm font-bold text-[#40516A] lg:grid-cols-[1fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr_0.7fr] lg:items-center">
                    <span className="font-black text-[#1A1F36]">{item.patient_name}</span><span>{item.doctor_name}</span><span className="uppercase">{item.status}</span><span>Paid</span><span>Jitsi</span><span>{fmtDuration(item.call_started_at, item.call_ended_at)}</span><span>{item.booking_date} {item.booking_time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#1A1F36]/8 pt-4">
              <p className="text-xs font-semibold text-[#8896A4]">
                Showing Page {connectionsPage} of {connectionsTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={connectionsPage === 1}
                  onClick={() => setConnectionsPage(prev => Math.max(prev - 1, 1))}
                  className="rounded-xl border border-[#1A1F36]/10 px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={connectionsPage === connectionsTotalPages}
                  onClick={() => setConnectionsPage(prev => Math.min(prev + 1, connectionsTotalPages))}
                  className="rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        ) : activeView === 'payments' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Platform Income</p>
                <h2 className="text-3xl font-black text-[#1A1F36]">Payments</h2>
                <p className="mt-2 text-sm font-semibold text-[#8896A4]">Manage all money received by 8liv from consultation fees, memberships, refunds, and Razorpay transactions.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input value={managementSearch} onChange={e => handleSearchChange(e.target.value)} placeholder="Search payment, patient, Razorpay ID..." className="min-w-[280px] rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C4622D]/20" />
                <a href={`/api/admin/reports?adminId=${adminUser?.id}&format=csv&type=payments`} className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-[#11162A]">
                  <ArrowDownToLine className="h-4 w-4" /> Export CSV
                </a>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Total Revenue', value: `Rs ${totalRevenue.toLocaleString('en-IN')}`, icon: Wallet, tone: 'blue' },
                { label: "Today's Revenue", value: `Rs ${todayRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, tone: 'green' },
                { label: 'Monthly Revenue', value: `Rs ${monthlyRevenue.toLocaleString('en-IN')}`, icon: Calendar, tone: 'orange' },
                { label: 'Successful Payments', value: successfulPaymentsCount, icon: CheckCircle2, tone: 'green' },
                { label: 'Pending Payments', value: pendingPaymentsCount, icon: Clock, tone: 'amber' },
                { label: 'Failed Payments', value: failedPaymentsCount, icon: XCircle, tone: 'red' },
                { label: 'Refunds', value: refundsCount, icon: RefreshCw, tone: 'red' },
                { label: 'Consultation Revenue', value: `Rs ${consultationRevenue.toLocaleString('en-IN')}`, icon: Stethoscope, tone: 'blue' },
                { label: 'Membership Revenue', value: `Rs ${membershipRevenue.toLocaleString('en-IN')}`, icon: BadgeCheck, tone: 'orange' },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                    <div className={`mb-4 inline-flex rounded-2xl p-3 ${toneClasses[card.tone]}`}><Icon className="h-5 w-5" /></div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#8896A4]">{card.label}</p>
                    <p className="mt-2 text-2xl font-black text-[#1A1F36]">{card.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
              <div className="flex flex-col gap-4 border-b border-[#1A1F36]/8 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {[
                    ['all', 'All Transactions'],
                    ['consultation', 'Consultation Payments'],
                    ['membership', 'Membership Payments'],
                    ['refunds', 'Refunds'],
                    ['failed', 'Failed Payments'],
                  ].map(([id, label]) => (
                    <button key={id} onClick={() => { setPaymentTab(id); setPaymentsPage(1); }} className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${paymentTab === id ? 'bg-[#1A1F36] text-white' : 'bg-[#F5F0EB] text-[#40516A] hover:text-[#C4622D]'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[1180px]">
                  <div className="grid grid-cols-[1fr_1.1fr_0.9fr_0.7fr_1fr_0.8fr_0.7fr_0.9fr_1.2fr] gap-4 bg-[#F5F0EB] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#8896A4]">
                    <span>Payment ID</span><span>Patient Name</span><span>Payment Type</span><span>Amount</span><span>Razorpay Payment ID</span><span>Method</span><span>Status</span><span>Date</span><span>Receipt</span>
                  </div>
                  <div className="divide-y divide-[#1A1F36]/8">
                    {paymentRows.length === 0 ? (
                      <div className="p-10 text-center text-sm font-bold text-[#8896A4]">
                        <p>No payment transactions match this view.</p>
                        <button onClick={() => { setPaymentTab('all'); setManagementSearch(''); }} className="mt-4 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Clear Filters</button>
                      </div>
                    ) : paymentRows.map(payment => {
                      const patient = assessments.find(item => item.patient_id === payment.patient_id || item.id === payment.patient_id);
                      return (
                        <div key={payment.id || payment.transaction_id} className="grid grid-cols-[1fr_1.1fr_0.9fr_0.7fr_1fr_0.8fr_0.7fr_0.9fr_1.2fr] gap-4 px-5 py-4 text-sm font-bold text-[#40516A]">
                          <span className="font-mono text-xs">{payment.id || payment.transaction_id || 'N/A'}</span>
                          <span className="font-black text-[#1A1F36]">{patient ? getPatientName(patient) : payment.patient_id || 'Patient'}</span>
                          <span className="capitalize">{payment.payment_type || 'payment'}</span>
                          <span>Rs {Number(payment.amount || 0).toLocaleString('en-IN')}</span>
                          <span className="font-mono text-xs">{payment.transaction_id || payment.metadata?.razorpay_payment_id || 'N/A'}</span>
                          <span>{payment.payment_method || payment.metadata?.method || 'Razorpay'}</span>
                          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${['success', 'paid', 'captured'].includes(String(payment.status || '').toLowerCase()) ? 'bg-[#5C7A6B]/12 text-[#5C7A6B]' : ['failed', 'cancelled'].includes(String(payment.status || '').toLowerCase()) ? 'bg-[#D96A6A]/12 text-[#B94D4D]' : 'bg-[#D89A3D]/12 text-[#B7792F]'}`}>{payment.status || 'pending'}</span>
                          <span>{payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-IN') : 'N/A'}</span>
                          <span className="flex flex-wrap gap-2">
                            <button onClick={() => viewPaymentReceipt(payment)} className="rounded-lg border border-[#1A1F36]/10 px-2 py-1 text-[10px] font-black">View</button>
                            <button onClick={() => downloadPaymentReceipt(payment)} className="rounded-lg border border-[#1A1F36]/10 px-2 py-1 text-[10px] font-black">Download</button>
                            <button onClick={() => refundPayment(payment)} className="rounded-lg bg-[#D96A6A]/12 px-2 py-1 text-[10px] font-black text-[#B94D4D]">Refund</button>
                            <button onClick={() => openPatientFromPayment(payment.patient_id)} className="rounded-lg bg-[#1A1F36]/8 px-2 py-1 text-[10px] font-black">Patient</button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#1A1F36]/8 pt-4">
              <p className="text-xs font-semibold text-[#8896A4]">
                Showing Page {paymentsPage} of {paymentsTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={paymentsPage === 1}
                  onClick={() => setPaymentsPage(prev => Math.max(prev - 1, 1))}
                  className="rounded-xl border border-[#1A1F36]/10 px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={paymentsPage === paymentsTotalPages}
                  onClick={() => setPaymentsPage(prev => Math.min(prev + 1, paymentsTotalPages))}
                  className="rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        ) : activeView === 'provider-wallets' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Provider Settlements</p>
                <h2 className="text-3xl font-black text-[#1A1F36]">Provider Wallets</h2>
                <p className="mt-2 text-sm font-semibold text-[#8896A4]">Manage money owed to doctors, dietitians, nutritionists, and fitness coaches.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input value={managementSearch} onChange={e => handleSearchChange(e.target.value)} placeholder="Search provider..." className="min-w-[240px] rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-bold outline-none" />
                <select value={providerFilter} onChange={e => { setProviderFilter(e.target.value); setProvidersPage(1); setPayoutsPage(1); setAuditPage(1); }} className="rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-bold">
                  <option value="all">All Providers</option><option value="doctor">Doctor</option><option value="dietitian">Dietitian</option><option value="nutritionist">Nutritionist</option><option value="fitness_coach">Fitness Coach</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option>
                </select>
                <a href={`/api/admin/reports?adminId=${adminUser?.id}&format=csv&type=payouts`} className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white"><ArrowDownToLine className="h-4 w-4" /> Export Payout Report</a>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {[
                { label: 'Total Provider Earnings', value: `Rs ${totalProviderEarnings.toLocaleString('en-IN')}`, icon: DollarSign, tone: 'blue' },
                { label: 'Pending Payouts', value: `Rs ${pendingPayouts.toLocaleString('en-IN')}`, icon: Clock, tone: 'amber' },
                { label: 'Processed Payouts', value: `Rs ${processedPayouts.toLocaleString('en-IN')}`, icon: CheckCircle2, tone: 'green' },
                { label: 'Wallet Balance', value: `Rs ${walletBalance.toLocaleString('en-IN')}`, icon: Wallet, tone: 'orange' },
                { label: 'Awaiting Settlement', value: providersAwaitingSettlement, icon: Users, tone: 'amber' },
                { label: 'Failed Payouts', value: failedPayouts, icon: XCircle, tone: 'red' },
              ].map(card => {
                const Icon = card.icon;
                return <div key={card.label} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]"><div className={`mb-4 inline-flex rounded-2xl p-3 ${toneClasses[card.tone]}`}><Icon className="h-5 w-5" /></div><p className="text-xs font-black uppercase tracking-widest text-[#8896A4]">{card.label}</p><p className="mt-2 text-2xl font-black text-[#1A1F36]">{card.value}</p></div>;
              })}
            </div>
            <div className="flex gap-2 border-b border-[#1A1F36]/8 pb-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'payouts', label: 'Payout Requests' },
                { id: 'audit', label: 'Audit Log' }
              ].map(subTab => (
                <button
                  key={subTab.id}
                  onClick={() => setWalletSubTab(subTab.id as any)}
                  className={`px-4 py-2 text-sm font-black transition-all rounded-xl ${
                    walletSubTab === subTab.id
                      ? 'bg-[#1A1F36] text-white'
                      : 'text-[#8896A4] hover:bg-[#1A1F36]/5'
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            {walletSubTab === 'overview' && (
              <div className="overflow-hidden rounded-[20px] border border-[#1A1F36]/8 bg-white shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <div className="grid min-w-[1200px] grid-cols-[1.1fr_0.7fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_1.3fr] gap-4 bg-[#F5F0EB] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#8896A4]">
                  <span>Provider Name</span><span>Role</span><span>Specialization</span><span>Completed</span><span>Wallet</span><span>Pending</span><span>Paid</span><span>Last Payout</span><span>Status</span><span>Actions</span>
                </div>
                <div className="overflow-x-auto divide-y divide-[#1A1F36]/8">
                  {paginatedProviderRows.length === 0 ? <div className="p-10 text-center text-sm font-bold text-[#8896A4]"><p>No provider wallets match this filter.</p><button onClick={() => { setProviderFilter('all'); setManagementSearch(''); }} className="mt-4 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Clear Filters</button></div> : paginatedProviderRows.map(provider => {
                    const providerTx = transactions.filter(tx => (tx.provider_id || tx.doctor_id) === provider.provider_id);
                    const pendingAmount = providerTx.filter(tx => String(tx.status || 'PENDING').toUpperCase() === 'PENDING').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                    const paidAmount = providerTx.filter(tx => ['PROCESSED', 'PAID', 'CREDITED', 'SUCCESS'].includes(String(tx.status || '').toUpperCase()) && tx.transaction_type === 'PAYOUT').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                    const lastPayout = providerTx.filter(tx => tx.created_at && tx.transaction_type === 'PAYOUT').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                    const completed = consultationRows.filter(c => (c.doctor_id || c.staff_id) === provider.provider_id && completedStatuses.includes(String(c.status || '').toLowerCase())).length;
                    
                    // Find if there's any pending payout in provider_payouts table
                    const activePayout = providerPayouts.find(p => p.provider_id === provider.provider_id && p.payout_status === 'PENDING');

                    return (
                      <div key={provider.provider_id} className="grid min-w-[1200px] grid-cols-[1.1fr_0.7fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_1.3fr] gap-4 px-5 py-4 text-sm font-bold text-[#40516A] hover:bg-gray-50 transition-colors">
                        <span className="font-black text-[#1A1F36]">{provider.name}</span><span className="capitalize">{String(provider.role || '').replace('_', ' ')}</span><span>{provider.specialization}</span><span>{completed}</span><span>Rs {Number(provider.balance || 0).toLocaleString('en-IN')}</span><span>Rs {Number(provider.pending_balance || 0).toLocaleString('en-IN')}</span><span>Rs {Number(provider.total_paid || 0).toLocaleString('en-IN')}</span><span>{lastPayout?.created_at ? new Date(lastPayout.created_at).toLocaleDateString('en-IN') : 'N/A'}</span><span className={provider.pending_balance > 0 ? 'text-[#B7792F]' : 'text-[#5C7A6B]'}>{provider.pending_balance > 0 ? 'Pending' : 'Settled'}</span>
                        <span className="flex flex-wrap gap-2">
                          <button onClick={() => { setManagementSearch(provider.name || ''); setProviderFilter('all'); }} className="rounded-lg border border-[#1A1F36]/10 px-2 py-1 text-[10px] font-black hover:bg-slate-50 transition-colors">View</button>
                          <button onClick={() => { setAdjustingProvider(provider); setAdjustAmount(''); setAdjustReason(''); setShowAdjustModal(true); }} className="rounded-lg bg-[#C4622D]/12 px-2 py-1 text-[10px] font-black text-[#C4622D] hover:bg-[#C4622D]/20 transition-colors">Adjust</button>
                          {activePayout ? (
                            <button onClick={() => handleProcessRazorpayPayout(activePayout.id, provider.name, activePayout.payout_amount)} className="rounded-lg bg-[#1A1F36] px-2 py-1 text-[10px] font-black text-white hover:bg-slate-800 transition-colors">Approve</button>
                          ) : (
                            <button disabled className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-400 cursor-not-allowed">Approve</button>
                          )}
                          <button onClick={() => { setManagementSearch(provider.name || ''); alert(`${provider.name} has ${providerTx.length} wallet transaction(s).`); }} className="rounded-lg border border-[#1A1F36]/10 px-2 py-1 text-[10px] font-black hover:bg-slate-50 transition-colors">History</button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-[#1A1F36]/8">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#8896A4]">
                      Showing Page {providersPage} of {providersTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={providersPage === 1}
                        onClick={() => setProvidersPage(prev => Math.max(prev - 1, 1))}
                        className="rounded-xl border border-[#1A1F36]/10 px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        disabled={providersPage === providersTotalPages}
                        onClick={() => setProvidersPage(prev => Math.min(prev + 1, providersTotalPages))}
                        className="rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {walletSubTab === 'payouts' && (
              <div className="overflow-hidden rounded-[20px] border border-[#1A1F36]/8 bg-white shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <div className="grid min-w-[1000px] grid-cols-[1.2fr_0.8fr_1fr_1fr_1.2fr_1.2fr] gap-4 bg-[#F5F0EB] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#8896A4]">
                  <span>Provider Name</span><span>Role</span><span>Date Requested</span><span>Amount</span><span>Status</span><span>Actions</span>
                </div>
                <div className="overflow-x-auto divide-y divide-[#1A1F36]/8">
                  {providerPayouts.length === 0 ? (
                    <div className="p-10 text-center text-sm font-bold text-[#8896A4]">
                      <p>No payout requests found.</p>
                    </div>
                  ) : (
                    providerPayouts.map(payout => {
                      const providerProfile = providers.find(p => p.provider_id === payout.provider_id) || doctors.find(d => d.doctor_id === payout.provider_id) || allStaff.find(s => s.id === payout.provider_id);
                      const providerName = providerProfile ? (providerProfile.full_name || providerProfile.name || `${providerProfile.first_name || ''} ${providerProfile.last_name || ''}`.trim() || providerProfile.email) : 'Unknown Provider';
                      const role = providerProfile?.role || 'provider';
                      const status = String(payout.payout_status || 'PENDING').toUpperCase();

                      const statusColors: Record<string, string> = {
                        PENDING: 'bg-[#D89A3D]/12 text-[#B7792F]',
                        PROCESSING: 'bg-[#1A1F36]/8 text-[#1A1F36] animate-pulse',
                        COMPLETED: 'bg-[#5C7A6B]/12 text-[#5C7A6B]',
                        FAILED: 'bg-[#D96A6A]/12 text-[#B94D4D]'
                      };

                      return (
                        <div key={payout.id} className="grid min-w-[1000px] grid-cols-[1.2fr_0.8fr_1fr_1fr_1.2fr_1.2fr] gap-4 px-5 py-4 text-sm font-bold text-[#40516A] hover:bg-gray-50 transition-colors">
                          <span className="font-black text-[#1A1F36]">{providerName}</span>
                          <span className="capitalize">{String(role).replace('_', ' ')}</span>
                          <span>{payout.initiated_at ? new Date(payout.initiated_at).toLocaleString('en-IN') : 'N/A'}</span>
                          <span className="font-black text-[#1A1F36]">Rs {Number(payout.payout_amount).toLocaleString('en-IN')}</span>
                          <div>
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${statusColors[status] || statusColors.PENDING}`}>
                              {status}
                            </span>
                            {status === 'FAILED' && payout.failure_reason && (
                              <p className="mt-1 text-xs text-[#B94D4D] font-medium max-w-xs">{payout.failure_reason}</p>
                            )}
                          </div>
                          <span className="flex flex-wrap gap-2">
                            {status === 'PENDING' && (
                              <button
                                onClick={() => handleProcessRazorpayPayout(payout.id, providerName, payout.payout_amount)}
                                className="rounded-lg bg-[#1A1F36] px-3 py-1 text-[10px] font-black text-white hover:bg-slate-800 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {status === 'FAILED' && (
                              <button
                                onClick={() => handleProcessRazorpayPayout(payout.id, providerName, payout.payout_amount)}
                                className="rounded-lg bg-[#D96A6A] px-3 py-1 text-[10px] font-black text-white hover:bg-[#B94D4D] transition-colors"
                              >
                                Retry
                              </button>
                            )}
                            {status === 'PROCESSING' && (
                              <span className="text-xs text-[#8896A4] italic font-semibold">Processing...</span>
                            )}
                            {status === 'COMPLETED' && (
                              <span className="text-xs text-[#5C7A6B] font-black">✓ Completed</span>
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-4 border-t border-[#1A1F36]/8">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#8896A4]">
                      Showing Page {payoutsPage} of {payoutsTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={payoutsPage === 1}
                        onClick={() => setPayoutsPage(prev => Math.max(prev - 1, 1))}
                        className="rounded-xl border border-[#1A1F36]/10 px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        disabled={payoutsPage === payoutsTotalPages}
                        onClick={() => setPayoutsPage(prev => Math.min(prev + 1, payoutsTotalPages))}
                        className="rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {walletSubTab === 'audit' && (
              <div className="overflow-hidden rounded-[20px] border border-[#1A1F36]/8 bg-white shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <div className="grid min-w-[1200px] grid-cols-[1.2fr_1fr_1.5fr_1fr_1.5fr_1fr_1.5fr] gap-4 bg-[#F5F0EB] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#8896A4]">
                  <span>Date & Time</span><span>Provider</span><span>Event</span><span>Amount</span><span>Balances (Old → New)</span><span>Initiator</span><span>Details</span>
                </div>
                <div className="overflow-x-auto divide-y divide-[#1A1F36]/8">
                  {auditLogs.length === 0 ? (
                    <div className="p-10 text-center text-sm font-bold text-[#8896A4]">
                      <p>No audit logs found.</p>
                    </div>
                  ) : (
                    auditLogs.map(log => {
                      const providerProfile = providers.find(p => p.provider_id === log.provider_id) || doctors.find(d => d.doctor_id === log.provider_id) || allStaff.find(s => s.id === log.provider_id);
                      const providerName = providerProfile ? (providerProfile.full_name || providerProfile.name || `${providerProfile.first_name || ''} ${providerProfile.last_name || ''}`.trim() || providerProfile.email) : 'Unknown Provider';
                      
                      const initiatorProfile = doctors.find(d => d.doctor_id === log.initiated_by) || allStaff.find(s => s.id === log.initiated_by) || providers.find(p => p.provider_id === log.initiated_by);
                      const initiatorName = initiatorProfile ? (initiatorProfile.full_name || initiatorProfile.name || `${initiatorProfile.first_name || ''} ${initiatorProfile.last_name || ''}`.trim()) : (log.initiated_by ? 'Admin' : 'System');

                      return (
                        <div key={log.id} className="grid min-w-[1200px] grid-cols-[1.2fr_1fr_1.5fr_1fr_1.5fr_1fr_1.5fr] gap-4 px-5 py-4 text-xs font-bold text-[#40516A] hover:bg-gray-50 transition-colors">
                          <span>{log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : 'N/A'}</span>
                          <span className="font-bold text-[#1A1F36]">{providerName}</span>
                          <span className="font-black text-xs text-[#C4622D]">{log.event_type}</span>
                          <span className={log.amount < 0 ? 'text-[#B94D4D]' : log.amount > 0 ? 'text-[#5C7A6B]' : ''}>
                            {log.amount !== null ? `Rs ${Number(log.amount).toLocaleString('en-IN')}` : '—'}
                          </span>
                          <span>
                            {log.old_balance !== null && log.new_balance !== null 
                              ? `Rs ${Number(log.old_balance).toLocaleString('en-IN')} → Rs ${Number(log.new_balance).toLocaleString('en-IN')}`
                              : '—'}
                          </span>
                          <span>{initiatorName}</span>
                          <span className="font-mono text-[10px] text-[#8896A4] truncate" title={JSON.stringify(log.details)}>
                            {JSON.stringify(log.details)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-4 border-t border-[#1A1F36]/8">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#8896A4]">
                      Showing Page {auditPage} of {auditTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={auditPage === 1}
                        onClick={() => setAuditPage(prev => Math.max(prev - 1, 1))}
                        className="rounded-xl border border-[#1A1F36]/10 px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        disabled={auditPage === auditTotalPages}
                        onClick={() => setAuditPage(prev => Math.min(prev + 1, auditTotalPages))}
                        className="rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showAdjustModal && adjustingProvider && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowAdjustModal(false)}
                  className="absolute inset-0 bg-[#1A1F36]/60 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_24px_48px_rgba(26,31,54,0.16)]"
                >
                  <h3 className="text-xl font-black text-[#1A1F36] mb-2">Adjust Wallet Account</h3>
                  <p className="text-sm font-semibold text-[#8896A4] mb-6">
                    Modify wallet balance for <span className="text-[#1A1F36] font-bold">{adjustingProvider.name}</span>.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#8896A4] mb-2">
                        Adjustment Amount (Rs)
                      </label>
                      <input
                        type="number"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="e.g. 500 or -500"
                        className="w-full rounded-xl border border-[#1A1F36]/10 px-4 py-3 text-sm font-bold outline-none focus:border-[#C4622D]"
                      />
                      <p className="mt-1.5 text-xs text-[#8896A4]">
                        Use positive numbers to credit, negative to debit.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#8896A4] mb-2">
                        Reason / Notes
                      </label>
                      <textarea
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Describe why this adjustment is being made..."
                        className="w-full h-24 rounded-xl border border-[#1A1F36]/10 px-4 py-3 text-sm font-bold outline-none focus:border-[#C4622D] resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowAdjustModal(false)}
                      className="rounded-xl border border-[#1A1F36]/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={adjustSubmitting}
                      onClick={handleAdjustWallet}
                      className="rounded-xl bg-[#C4622D] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#A84E1F] transition-colors disabled:opacity-50"
                    >
                      {adjustSubmitting ? 'Submitting...' : 'Submit Adjustment'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        ) : activeView === 'membership-plans' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Membership Business</p><h2 className="text-3xl font-black text-[#1A1F36]">Membership Plans</h2><p className="mt-2 text-sm font-semibold text-[#8896A4]">Create, edit, activate, deactivate, and manage Gold and Silver plans.</p></div>
              <div className="flex flex-wrap gap-2"><button onClick={async () => { const plan = plans[0]; if (!plan) return alert('No plan available.'); const code = window.prompt('Discount code'); if (!code) return; const percent = window.prompt('Discount percent', '10') || '0'; try { await savePlan(plan, { discountCode: code, discountPercent: percent }); alert('Discount added.'); } catch (err: any) { alert(err.message); } }} className="rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Add Discount</button><a href={`/api/admin/reports?adminId=${adminUser?.id}&format=csv&type=memberships`} className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/10 bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-[#1A1F36]"><ArrowDownToLine className="h-4 w-4" /> Export Members</a></div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {[
                { label: 'Active Plans', value: plans.filter(plan => plan.is_active !== false).length, icon: BadgeCheck, tone: 'blue' },
                { label: 'Gold Members', value: goldMembers, icon: ShieldCheck, tone: 'orange' },
                { label: 'Silver Members', value: silverMembers, icon: Users, tone: 'blue' },
                { label: 'Membership Revenue', value: `Rs ${membershipRevenue.toLocaleString('en-IN')}`, icon: Wallet, tone: 'green' },
                { label: 'New This Month', value: newMembershipsThisMonth, icon: Calendar, tone: 'amber' },
                { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, tone: 'red' },
              ].map(card => {
                const Icon = card.icon;
                return <div key={card.label} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]"><div className={`mb-4 inline-flex rounded-2xl p-3 ${toneClasses[card.tone]}`}><Icon className="h-5 w-5" /></div><p className="text-xs font-black uppercase tracking-widest text-[#8896A4]">{card.label}</p><p className="mt-2 text-2xl font-black text-[#1A1F36]">{card.value}</p></div>;
              })}
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {['Silver', 'Gold'].map(planName => {
                const plan = plans.find(item => String(item.name || '').toLowerCase().includes(planName.toLowerCase())) || { name: `${planName} Plan`, price_monthly: planName === 'Gold' ? 4999 : 2999, is_active: true, features: planName === 'Gold' ? ['Doctor consultation', 'Medication support', 'Dietitian support', 'Nutritionist support', 'Fitness coach support'] : ['Doctor consultation', 'Medication support'] };
                const activeMembers = planName === 'Gold' ? goldMembers : silverMembers;
                return (
                  <div key={planName} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">{planName} Plan</p><h3 className="mt-1 text-3xl font-black text-[#1A1F36]">Rs {Number(plan.price_monthly || 0).toLocaleString('en-IN')}</h3><p className="mt-1 text-sm font-bold text-[#8896A4]">Monthly duration</p></div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${plan.is_active !== false ? 'bg-[#5C7A6B]/12 text-[#5C7A6B]' : 'bg-[#D96A6A]/12 text-[#B94D4D]'}`}>{plan.is_active !== false ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="mt-5 space-y-2">{(plan.features || []).map((feature: string) => <div key={feature} className="flex items-center gap-2 rounded-xl bg-[#F5F0EB]/70 px-4 py-3 text-sm font-bold text-[#40516A]"><CheckCircle2 className="h-4 w-4 text-[#5C7A6B]" />{feature}</div>)}</div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold"><div className="rounded-2xl bg-[#1A1F36]/8 p-4">Active Members<br /><span className="text-2xl font-black">{activeMembers}</span></div><div className="rounded-2xl bg-[#D89A3D]/12 p-4">Discount<br />{plan.discount_code || 'None'}</div></div>
                    <div className="mt-5 flex flex-wrap gap-2"><button onClick={async () => { const price = window.prompt(`New monthly price for ${plan.name}`, String(plan.price_monthly || '')); if (!price) return; try { await savePlan(plan, { priceMonthly: price }); alert('Plan price updated.'); } catch (err: any) { alert(err.message); } }} className="rounded-xl bg-[#1A1F36] px-4 py-3 text-xs font-black uppercase tracking-wider text-white">Edit Plan</button><button onClick={async () => { const features = window.prompt('Comma-separated features', (plan.features || []).join(', ')); if (features === null) return; try { await savePlan(plan, { features: features.split(',').map((item: string) => item.trim()).filter(Boolean) }); alert('Plan features updated.'); } catch (err: any) { alert(err.message); } }} className="rounded-xl border border-[#1A1F36]/10 px-4 py-3 text-xs font-black uppercase tracking-wider">Edit Features</button><button onClick={() => setMembershipFilter(planName.toLowerCase())} className="rounded-xl border border-[#1A1F36]/10 px-4 py-3 text-xs font-black uppercase tracking-wider">View Members</button><button onClick={async () => { try { await savePlan(plan, { isActive: plan.is_active === false }); alert('Plan status updated.'); } catch (err: any) { alert(err.message); } }} className="rounded-xl bg-[#D96A6A]/12 px-4 py-3 text-xs font-black uppercase tracking-wider text-[#B94D4D]">{plan.is_active !== false ? 'Deactivate' : 'Activate'}</button></div>
                  </div>
                );
              })}
            </div>
            <div className="overflow-hidden rounded-[20px] border border-[#1A1F36]/8 bg-white shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.9fr_0.9fr_0.9fr_1.1fr_0.7fr] gap-4 bg-[#F5F0EB] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#8896A4]"><span>Patient Name</span><span>Plan Type</span><span>Start Date</span><span>Expiry Date</span><span>Payment Status</span><span>Assigned Care Team</span><span>Status</span></div>
              <div className="divide-y divide-[#1A1F36]/8">
                {membershipMembers.length === 0 ? <div className="p-10 text-center text-sm font-bold text-[#8896A4]"><p>No membership members found.</p><button onClick={() => openAdminTab('patients')} className="mt-4 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Open Patients</button></div> : membershipMembers.map(patient => (
                  <div key={patient.id} className="grid grid-cols-[1.2fr_0.8fr_0.9fr_0.9fr_0.9fr_1.1fr_0.7fr] gap-4 px-5 py-4 text-sm font-bold text-[#40516A]">
                    <span className="font-black text-[#1A1F36]">{getPatientName(patient)}</span><span>{getPatientMembership(patient)}</span><span>{patient.created_at ? new Date(patient.created_at).toLocaleDateString('en-IN') : 'N/A'}</span><span>{patient.created_at ? new Date(new Date(patient.created_at).setFullYear(new Date(patient.created_at).getFullYear() + 1)).toLocaleDateString('en-IN') : 'N/A'}</span><span>{patient.consultation_fee_paid ? 'Paid' : 'Pending'}</span><span>Doctor + care team</span><span>Active</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : false ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-5">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">{adminTab === 'provider-wallets' ? 'Provider Wallets' : 'Payments'}</p><h2 className="text-3xl font-black text-[#1A1F36]">{adminTab === 'provider-wallets' ? 'Provider Wallets' : 'Payment Management'}</h2></div>
            {adminTab === 'provider-wallets' ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{doctors.map(doc => {
                const pending = transactions.filter(tx => tx.doctor_id === doc.doctor_id && tx.type === 'CONSULTATION_PAYOUT' && String(tx.payout_status || 'PENDING').toUpperCase() === 'PENDING');
                const processed = transactions.filter(tx => tx.doctor_id === doc.doctor_id && String(tx.payout_status || '').toUpperCase() === 'PROCESSED');
                return <div key={doc.doctor_id} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]"><div className="flex items-start justify-between"><div><h3 className="text-lg font-black text-[#1A1F36]">{doc.full_name}</h3><p className="text-sm font-bold text-[#8896A4]">Transaction History</p></div><p className="text-2xl font-black text-[#1A1F36]">₹{Number(doc.balance || 0).toLocaleString('en-IN')}</p></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#D89A3D]/12 p-4"><p className="text-xs font-black text-[#B7792F]">Pending Payouts</p><p className="text-xl font-black">{pending.length}</p></div><div className="rounded-2xl bg-[#5C7A6B]/12 p-4"><p className="text-xs font-black text-[#5C7A6B]">Processed</p><p className="text-xl font-black">{processed.length}</p></div></div>{pending[0] && <button onClick={() => handleProcessRazorpayPayout(pending[0].id, doc.full_name, pending[0].amount)} className="mt-4 rounded-xl bg-[#1A1F36] px-4 py-3 text-xs font-black uppercase tracking-wider text-white">Approve Payout</button>}</div>
              })}</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                {[{label:'Consultation Payments', rows:consultationPayments},{label:'Membership Payments', rows:membershipPayments},{label:'Refunds', rows:refunds},{label:'Razorpay Transactions', rows:razorpayTransactions}].map(group => <div key={group.label} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]"><h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">{group.label}</h3><p className="mt-2 text-3xl font-black">₹{group.rows.reduce((sum:any, p:any) => sum + Number(p.amount || 0), 0).toLocaleString('en-IN')}</p><div className="mt-4 space-y-3">{group.rows.slice(0,5).map((p:any) => <div key={p.id || p.transaction_id} className="rounded-xl bg-[#F5F0EB]/65 p-3 text-xs font-bold text-[#40516A]"><p>{p.transaction_id || p.id}</p><p>₹{Number(p.amount || 0).toLocaleString('en-IN')} · {p.status}</p></div>)}</div></div>)}
              </div>
            )}
          </motion.div>
        ) : false ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-5">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Memberships</p><h2 className="text-3xl font-black text-[#1A1F36]">Gold and Silver Plans</h2></div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {plans.map(plan => <div key={plan.id || plan.name} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]"><div className="flex items-start justify-between"><div><h3 className="text-2xl font-black text-[#1A1F36]">{plan.name}</h3><p className="mt-1 text-sm font-bold text-[#8896A4]">Pricing, features, and discounts</p></div><p className="text-3xl font-black text-[#C4622D]">₹{Number(plan.price_monthly || 0).toLocaleString('en-IN')}</p></div><div className="mt-5 flex flex-wrap gap-2">{(plan.features || []).map((feature:string) => <span key={feature} className="rounded-full bg-[#F5F0EB] px-3 py-1 text-xs font-bold text-[#40516A]">{feature}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold"><div className="rounded-2xl bg-[#1A1F36]/8 p-4">Consultation Fee<br />₹{plan.consultation_fee || 499}</div><div className="rounded-2xl bg-[#D89A3D]/12 p-4">Discount<br />{plan.discount_code || 'None'} {plan.discount_percent ? `(${plan.discount_percent}%)` : ''}</div></div></div>)}
            </div>
          </motion.div>
        ) : false && activeView === 'connections' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-5xl mx-auto">
            {selectedConnection ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setSelectedConnection(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-sm transition-all flex items-center gap-2">
                    ← Back
                  </button>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Link2 className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Connection Details
                  </h2>
                </div>

                {/* Doctor info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Stethoscope className="w-4 h-4"/> Doctor</h3>
                    <p className="text-2xl font-black text-slate-900">{selectedConnection.doctor_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 px-3 py-1 rounded-lg inline-block">ID: {selectedConnection.doctor_id}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User className="w-4 h-4"/> Patient</h3>
                    <p className="text-2xl font-black text-slate-900">{selectedConnection.patient_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 px-3 py-1 rounded-lg inline-block">ID: {selectedConnection.patient_id}</p>
                    {selectedConnection.patient_phone && <p className="text-xs text-slate-500 font-bold mt-1">📞 {selectedConnection.patient_phone}</p>}
                    {selectedConnection.patient_age && <p className="text-xs text-slate-500 font-bold mt-0.5">Age: {selectedConnection.patient_age}</p>}
                  </div>
                </div>

                {/* Consultation details */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="w-4 h-4"/> Consultation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={`text-sm font-black uppercase px-3 py-1 rounded-full ${selectedConnection.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : selectedConnection.status === 'attended' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{selectedConnection.status}</span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Date</p>
                      <p className="font-black text-slate-900 text-sm">{selectedConnection.booking_date || '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Time</p>
                      <p className="font-black text-slate-900 text-sm">{selectedConnection.booking_time || '—'}</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Timer className="w-3 h-3"/> Call Duration</p>
                      <p className="font-black text-indigo-700 text-sm">{fmtDuration(selectedConnection.call_started_at, selectedConnection.call_ended_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Prescription */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Pill className="w-4 h-4"/> Prescription</h3>
                  {selectedConnection.prescription_type ? (
                    <div className="space-y-3">
                      <div className="flex gap-3 flex-wrap">
                        <span className={`font-black px-4 py-2 rounded-xl text-sm border ${selectedConnection.prescription_type === 'none' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                          {selectedConnection.prescription_type === 'none' ? '🚫 No Prescription' : selectedConnection.prescription_type === 'Oral' ? '💊 Oral' : '💉 Injectable'}
                        </span>
                      </div>
                      {selectedConnection.prescription_text && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-3">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Doctor's Notes</p>
                          <p className="text-slate-800 font-semibold text-sm leading-relaxed whitespace-pre-wrap">{selectedConnection.prescription_text}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 font-semibold text-sm">No prescription written yet</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-32">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                  <Link2 className="w-10 h-10 text-indigo-400"/>
                </div>
                <h3 className="text-xl font-black text-slate-700">Select a Connection</h3>
                <p className="text-slate-400 font-semibold mt-2 text-sm">Click any pair on the left to see full details</p>
              </div>
            )}
          </motion.div>
        ) : Boolean(false) ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-6xl mx-auto space-y-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <Wallet className="w-10 h-10 text-indigo-500 bg-indigo-50 p-2 rounded-2xl"/> Payout Requests
                </h2>
                <p className="text-slate-500 font-bold mt-2">Approve RazorpayX consultation payouts and track doctor wallet transfers.</p>
              </div>
              <button 
                onClick={fetchPayoutsData} 
                className="bg-white border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 font-bold px-5 py-3 rounded-2xl text-xs shadow-sm transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${payoutLoading ? 'animate-spin' : ''}`}/> Refresh Data
              </button>
            </div>

            {/* PENDING RAZORPAYX CONSULTATION PAYOUTS */}
            <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Pending Consultation Payouts
              </h3>
              {transactions.filter(tx => tx.type === 'CONSULTATION_PAYOUT' && (tx.payout_status || 'PENDING') === 'PENDING' && !tx.razorpay_payout_id).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <CheckCircle2 className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-base font-semibold text-gray-500 mb-1">No pending consultation payouts</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">Completed paid consultations will appear here after the doctor wallet is credited.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.filter(tx => tx.type === 'CONSULTATION_PAYOUT' && (tx.payout_status || 'PENDING') === 'PENDING' && !tx.razorpay_payout_id).map((tx: any, index: number) => {
                    const doc = doctors.find(d => d.doctor_id === tx.doctor_id);
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={tx.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border border-indigo-200 bg-indigo-50/50 gap-4 transition-colors hover:bg-indigo-50 hover:border-indigo-300 shadow-sm hover:shadow-md"
                      >
                        <div>
                          <h4 className="font-black text-slate-800 text-lg leading-tight">{doc?.full_name || 'Dr. Doctor'}</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1.5">Appointment: {tx.appointment_id || 'Not linked'}</p>
                          <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5"/> Credited: {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 uppercase tracking-widest px-2.5 py-1 rounded-md mt-3 inline-block">RazorpayX Pending</span>
                        </div>
                        <div className="flex items-center gap-6 self-end md:self-auto">
                          <p className="text-3xl font-black text-slate-900">₹{Number(tx.amount).toLocaleString('en-IN')}</p>
                          <button
                            onClick={() => handleProcessRazorpayPayout(tx.id, doc?.full_name, tx.amount)}
                            className="bg-[#1A1F36] hover:bg-[#11162A] text-white font-black py-4 px-6 rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 hover:-translate-y-0.5 active:scale-95"
                          >
                            <DollarSign className="w-4 h-4"/> Approve RazorpayX
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PENDING WITHDRAWAL REQUESTS */}
            <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-500 bg-amber-50 p-1.5 rounded-xl"/> Pending Withdrawal Requests
              </h3>
              {transactions.filter(tx => tx.type === 'withdrawal' && tx.status !== 'paid' && tx.status !== 'approved' && tx.status !== 'completed').length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <CheckCircle2 className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-base font-semibold text-gray-500 mb-1">All cleared!</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">No pending withdrawal requests from doctors.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.filter(tx => tx.type === 'withdrawal' && tx.status !== 'paid' && tx.status !== 'approved' && tx.status !== 'completed').map((tx: any, index: number) => {
                    const doc = doctors.find(d => d.doctor_id === tx.doctor_id);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={tx.id} 
                        className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border border-orange-200 bg-orange-50/50 gap-4 transition-colors hover:bg-orange-50 hover:border-orange-300 cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <div>
                          <h4 className="font-black text-slate-800 text-lg leading-tight">{doc?.full_name || 'Dr. Doctor'}</h4>
                          <p className="text-xs text-slate-400 font-bold mt-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Requested: {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          <span className="text-[10px] font-black text-amber-700 bg-amber-100 uppercase tracking-widest px-2.5 py-1 rounded-md mt-3 inline-block">Pending Payout</span>
                        </div>
                        <div className="flex items-center gap-6 self-end md:self-auto">
                          <p className="text-3xl font-black text-slate-900">₹{tx.amount.toLocaleString('en-IN')}</p>
                          <button 
                            onClick={() => handleMarkAsPaid(tx.id, doc?.full_name, tx.amount)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 hover:-translate-y-0.5 active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4"/> Mark as Paid (Offline)
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RAZORPAYX PAYOUT STATUS */}
            <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-500 bg-blue-50 p-1.5 rounded-xl"/> RazorpayX Consultation Payout Status
              </h3>
              {transactions.filter(tx => tx.type === 'CONSULTATION_PAYOUT' && ['PROCESSING', 'PROCESSED', 'FAILED'].includes(String(tx.payout_status || '').toUpperCase())).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                    <Activity className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-black text-slate-700 mb-2">No RazorpayX payouts yet</h3>
                  <p className="text-sm font-semibold text-slate-400 max-w-[280px]">Approved consultation payouts will move here until the RazorpayX webhook confirms success.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.filter(tx => tx.type === 'CONSULTATION_PAYOUT' && ['PROCESSING', 'PROCESSED', 'FAILED'].includes(String(tx.payout_status || '').toUpperCase())).map((tx: any, index: number) => {
                    const doc = doctors.find(d => d.doctor_id === tx.doctor_id);
                    const status = String(tx.payout_status || '').toUpperCase();
                    const badgeClass = status === 'PROCESSED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : status === 'FAILED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700';
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={tx.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-[1.8rem] border border-slate-100 hover:bg-gray-50 transition-colors gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                            <DollarSign className="w-6 h-6"/>
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-base">Consultation payout to {doc?.full_name || 'Dr. Doctor'}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">RazorpayX ID: {tx.razorpay_payout_id || 'Pending'}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">Appointment: {tx.appointment_id || 'Not linked'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xl text-slate-900">₹{Number(tx.amount).toLocaleString('en-IN')}</p>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md mt-1.5 inline-block ${badgeClass}`}>{status}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COMPLETED PAYOUTS HISTORY */}
            <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 bg-emerald-50 p-1.5 rounded-xl"/> Payout History
              </h3>
              {transactions.filter(tx => tx.type === 'withdrawal' && (tx.status === 'paid' || tx.status === 'approved' || tx.status === 'completed')).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-slate-700 mb-2">No completed payouts</h3>
                  <p className="text-sm font-semibold text-slate-400 max-w-[250px]">No completed payouts history found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.filter(tx => tx.type === 'withdrawal' && (tx.status === 'paid' || tx.status === 'approved' || tx.status === 'completed')).map((tx: any, index: number) => {
                    const doc = doctors.find(d => d.doctor_id === tx.doctor_id);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={tx.id} 
                        className="flex items-center justify-between p-5 rounded-[1.8rem] border border-slate-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                            <ArrowDownToLine className="w-6 h-6"/>
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-base">Payout to {doc?.full_name || 'Dr. Doctor'}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xl text-emerald-600">-₹{tx.amount.toLocaleString('en-IN')}</p>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 mt-1.5 inline-block">Paid Offline</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : activeView === 'staff' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-4xl mx-auto space-y-8">
            {selectedStaff ? (
              <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <button
                    onClick={() => setSelectedStaff(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-sm transition-all"
                  >
                    ← Back to Appoint Form
                  </button>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Staff Member Details</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                    <p className="text-xl font-black text-slate-800">{selectedStaff.first_name} {selectedStaff.last_name}</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Role</p>
                    <span className={`text-sm font-black uppercase px-3 py-1 rounded-full inline-block mt-1 ${selectedStaff.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : selectedStaff.role === 'doctor' ? 'bg-blue-100 text-blue-700 border border-blue-200' : selectedStaff.role === 'dietitian' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {selectedStaff.role}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="text-lg font-bold text-slate-700">{selectedStaff.phone_number || 'N/A'}</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Unique User ID</p>
                    <p className="text-sm font-mono text-slate-500">{selectedStaff.id}</p>
                  </div>
                </div>

                {/* Remove Staff Action */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
                  {selectedStaff.id === adminUser?.id ? (
                    <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 text-xs font-black text-center uppercase tracking-wider">
                      🛡️ Currently Logged In (Self-deletion Blocked)
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRemoveStaff(selectedStaff)}
                      disabled={staffDeleting}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-black text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 transition-all duration-300 shadow-lg hover:shadow-rose-600/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
                    >
                      {staffDeleting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Removing Staff Member...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5"/>
                          Remove Staff Member / Doctor
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-indigo-500 bg-indigo-50/80 p-1.5 rounded-xl"/> Appoint New Clinician / Staff
                </h2>
                <p className="text-slate-500 font-semibold text-sm mb-8">
                  Appoint a new administrator, doctor (physician), dietitian, or fitness trainer. Credentials will bypass email confirmation requirements.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!adminUser) return;
                    if (!staffEmail || !staffPassword || !staffFirstName || !staffLastName) {
                      alert('Please fill in all required fields.');
                      return;
                    }
                    setStaffSubmitting(true);
                    try {
                      const res = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          adminId: adminUser.id,
                          email: staffEmail,
                          password: staffPassword,
                          role: staffRole,
                          firstName: staffFirstName,
                          lastName: staffLastName,
                          phoneNumber: staffPhone
                        })
                      });

                      if (res.ok) {
                        alert('New staff member appointed successfully! ✅');
                        resetStaffForm();
                        await fetchStaffProfiles();
                      } else {
                        const data = await res.json();
                        alert(data.error || 'Failed to appoint staff.');
                      }
                    } catch (err: any) {
                      alert('Error: ' + err.message);
                    } finally {
                      setStaffSubmitting(false);
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">First Name *</label>
                      <input
                        type="text"
                        required
                        value={staffFirstName}
                        onChange={(e) => setStaffFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={staffLastName}
                        onChange={(e) => setStaffLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="doctor@8liv.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Initial Password *</label>
                      <input
                        type="password"
                        required
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">System Role *</label>
                      <select
                        value={staffRole}
                        onChange={(e: any) => setStaffRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="doctor">Doctor (Physician)</option>
                        <option value="dietitian">Dietitian</option>
                        <option value="trainer">Fitness Coach</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                      <input
                        type="text"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={staffSubmitting}
                      className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                      {staffSubmitting ? 'Appointing Clinician...' : 'Appoint Staff Member'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        ) : Boolean(false) ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Apple className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> 
                    {selectedPlan ? `Configure: ${selectedPlan.name}` : 'Create Membership Plan'}
                  </h2>
                  <p className="text-slate-500 font-semibold text-sm mt-1">
                    {selectedPlan ? 'Update pricing tiers, consultation fee, promotional discount codes, and features.' : 'Initialize a new membership subscription tier.'}
                  </p>
                </div>
                {selectedPlan && (
                  <button
                    onClick={() => { setSelectedPlan(null); resetPlanForm(); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs transition-all"
                  >
                    Create Instead
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!adminUser) return;
                  if (!planName || !planPrice) {
                    alert('Please fill in Plan Name and Monthly Price.');
                    return;
                  }
                  setPlanSubmitting(true);
                  try {
                    const parsedFeatures = planFeatures.split(',').map(f => f.trim()).filter(f => f.length > 0);
                    const res = await fetch('/api/admin/plans', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        adminId: adminUser.id,
                        name: planName,
                        priceMonthly: parseFloat(planPrice),
                        consultationFee: parseFloat(planConsultFee || '499'),
                        features: parsedFeatures,
                        isActive: planIsActive,
                        discountCode: planDiscountCode || null,
                        discountPercent: parseInt(planDiscountPercent || '0')
                      })
                    });

                    if (res.ok) {
                      alert('Membership plan saved successfully! ✅');
                      resetPlanForm();
                      setSelectedPlan(null);
                      await fetchPlans();
                    } else {
                      const data = await res.json();
                      alert(data.error || 'Failed to save plan.');
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message);
                  } finally {
                    setPlanSubmitting(false);
                  }
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan Name *</label>
                    <input
                      type="text"
                      required
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="Silver Plan / Gold Plan"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Monthly Subscription Price (INR) *</label>
                    <input
                      type="number"
                      required
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      placeholder="999"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Consultation Fee (INR)</label>
                    <input
                      type="number"
                      value={planConsultFee}
                      onChange={(e) => setPlanConsultFee(e.target.value)}
                      placeholder="499"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6 h-full">
                    <input
                      id="planIsActive"
                      type="checkbox"
                      checked={planIsActive}
                      onChange={(e) => setPlanIsActive(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="planIsActive" className="text-sm font-bold text-slate-700 cursor-pointer">
                      Plan is Active (Visible to members during checkout)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Discount Code (Promo Code)</label>
                    <input
                      type="text"
                      value={planDiscountCode}
                      onChange={(e) => setPlanDiscountCode(e.target.value)}
                      placeholder="SAVE20"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Discount Percent (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={planDiscountPercent}
                      onChange={(e) => setPlanDiscountPercent(e.target.value)}
                      placeholder="20"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan Features (comma-separated)</label>
                  <textarea
                    rows={4}
                    value={planFeatures}
                    onChange={(e) => setPlanFeatures(e.target.value)}
                    placeholder="GLP-1 Prescriptions, 1:1 Video Consultations, Pharmacy Delivery, priority chat support"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">Separate features with commas (e.g. Feature A, Feature B, Feature C)</p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={planSubmitting}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 text-sm flex items-center justify-center gap-2"
                  >
                    {planSubmitting ? 'Saving Configuration...' : selectedPlan ? 'Update Membership Plan' : 'Save Plan Configuration'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : activeView === 'dashboard' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 md:p-8 max-w-[1500px] mx-auto min-h-full"
          >
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">8liv Operations</p>
                <h2 className="mt-1 text-3xl font-black text-[#1A1F36] tracking-tight">Healthcare Operations Center</h2>
                <p className="mt-1 text-sm font-semibold text-[#8896A4]">Live platform, consultation, membership, revenue, and payout health.</p>
              </div>
              <button
                onClick={() => {
                  if (adminTab === 'dashboard') {
                    fetchDashboardData(adminUser?.id);
                  } else if (adminTab === 'patients') {
                    fetchPatients();
                  } else if (adminTab === 'appointments' || adminTab === 'video-consultations') {
                    fetchConnections();
                  } else if (adminTab === 'providers') {
                    fetchProviders();
                  } else if (adminTab === 'provider-wallets' || adminTab === 'payments') {
                    fetchPayoutsData();
                  } else if (adminTab === 'memberships') {
                    fetchPlans();
                  } else if (adminTab === 'dietitians' || adminTab === 'nutritionists') {
                    fetchStaffProfiles();
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1A1F36] shadow-sm hover:bg-[#F5F0EB]"
              >
                <RefreshCw className={`h-4 w-4 ${payoutLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.035 } }
              }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              {kpiCards.map((card) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.label}
                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(26,31,54,0.10)]"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className={`rounded-2xl p-3 ${toneClasses[card.tone]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="min-h-[34px] text-[11px] font-black uppercase tracking-widest text-[#8896A4]">{card.label}</p>
                    <p className="mt-2 break-words text-3xl font-black text-[#1A1F36]">{card.value}</p>
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Revenue Overview</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueOverviewData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E1DA" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8896A4' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8896A4' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#C4622D" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Daily Consultations</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyConsultationsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E1DA" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8896A4' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8896A4' }} />
                      <Tooltip />
                      <Bar dataKey="consultations" fill="#1A1F36" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Membership Distribution</h3>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={membershipDistributionData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                          {membershipDistributionData.map(item => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Consultation Status</h3>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={consultationStatusData.length ? consultationStatusData : [{ name: 'No Data', value: 1, color: '#D8E6DE' }]} dataKey="value" nameKey="name" outerRadius={88}>
                          {(consultationStatusData.length ? consultationStatusData : [{ name: 'No Data', value: 1, color: '#D8E6DE' }]).map(item => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Doctor Workload</h3>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={doctorWorkloadData} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E1DA" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#8896A4' }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#40516A' }} />
                      <Tooltip />
                      <Bar dataKey="consultations" fill="#5C7A6B" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Patient Growth</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={patientGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E1DA" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8896A4' }} minTickGap={18} />
                      <YAxis tick={{ fontSize: 11, fill: '#8896A4' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="patients" stroke="#5C7A6B" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Revenue vs Doctor Payout</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueVsPayoutData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E1DA" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8896A4' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8896A4' }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#C4622D" fill="#C4622D" fillOpacity={0.25} />
                      <Area type="monotone" dataKey="payouts" stackId="2" stroke="#1A1F36" fill="#1A1F36" fillOpacity={0.18} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Consultation Pipeline</h3>
                <div className="mt-5 space-y-3 text-sm font-bold text-[#40516A]">
                  <p className="flex justify-between"><span>Pending</span><span>{pendingConsultations}</span></p>
                  <p className="flex justify-between"><span>Active Calls</span><span>{activeVideoCalls}</span></p>
                  <p className="flex justify-between"><span>Completed</span><span>{completedConsultations}</span></p>
                </div>
              </div>
              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Membership Mix</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#C4622D]/10 p-4 text-[#C4622D]"><p className="text-xs font-black uppercase">Gold</p><p className="text-2xl font-black">{goldMembers}</p></div>
                  <div className="rounded-2xl bg-[#1A1F36]/8 p-4 text-[#1A1F36]"><p className="text-xs font-black uppercase">Silver</p><p className="text-2xl font-black">{silverMembers}</p></div>
                </div>
              </div>
              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Financial Snapshot</h3>
                <div className="mt-5 space-y-3 text-sm font-bold text-[#40516A]">
                  <p className="flex justify-between"><span>Monthly Revenue</span><span>₹{monthlyRevenue.toLocaleString('en-IN')}</span></p>
                  <p className="flex justify-between"><span>Platform Earnings</span><span>₹{platformEarnings.toLocaleString('en-IN')}</span></p>
                  <p className="flex justify-between"><span>Pending Payouts</span><span>₹{pendingPayouts.toLocaleString('en-IN')}</span></p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)] xl:col-span-1">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Live Operations</h3>
                  <span className="flex items-center gap-2 rounded-full bg-[#5C7A6B]/12 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#5C7A6B]">
                    <span className="h-2 w-2 rounded-full bg-[#5C7A6B]" /> Live
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {liveOperations.map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB]/55 p-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-xl p-2 ${toneClasses[item.tone]}`}><Icon className="h-4 w-4" /></div>
                          <span className="text-xs font-black uppercase tracking-wider text-[#40516A]">{item.label}</span>
                        </div>
                        <span className="text-xl font-black text-[#1A1F36]">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)] xl:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Recent Activity</h3>
                  <span className="text-xs font-bold text-[#8896A4]">Newest first</span>
                </div>
                <div className="max-h-[420px] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                  {recentActivities.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#1A1F36]/12 bg-[#F5F0EB]/40 p-8 text-center text-sm font-semibold text-[#8896A4]">
                      No recent platform activity yet.
                    </div>
                  ) : recentActivities.map(activity => (
                    <div key={activity.id} className="relative flex gap-4 rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB]/35 p-4">
                      <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${toneClasses[activity.tone].split(' ')[0]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-black text-[#1A1F36]">{activity.title}</p>
                          <p className="text-xs font-bold text-[#8896A4]">{new Date(activity.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[#40516A]">{activity.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeView === 'placeholder' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Enterprise Operations</p>
                <h2 className="mt-1 text-3xl font-black text-[#1A1F36]">{placeholderTitles[adminTab] || 'Operations'}</h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-[#8896A4]">
                  Premium controls for telemedicine reporting, communication, governance, and platform configuration.
                </p>
              </div>
              {adminTab === 'reports' && (
                <div className="flex flex-wrap gap-2">
                  {['csv', 'excel', 'pdf'].map(format => (
                    <a
                      key={format}
                      href={`/api/admin/reports?adminId=${adminUser?.id}&format=${format}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1A1F36] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C4622D]/35 hover:text-[#C4622D]"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Export {format === 'excel' ? 'Excel' : format.toUpperCase()}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {adminTab === 'platform-settings' ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                {settingsGroups.map(group => (
                  <div key={group.title} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                    <div className="mb-5">
                      <h3 className="text-lg font-black text-[#1A1F36]">{group.title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-[#8896A4]">{group.description}</p>
                    </div>
                    <div className="space-y-3">
                      {group.items.map(item => (
                        <div key={item.label} className="rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB]/55 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-[#1A1F36]">{item.label}</p>
                              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#8896A4]">{item.helper}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#C4622D] shadow-sm">{item.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => alert(`${group.title} settings are managed from this card. Database-backed settings persistence is ready to connect to a settings table.`)} className="mt-5 w-full rounded-xl bg-[#1A1F36] px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 hover:bg-[#11162A]">
                      Manage {group.title}
                    </button>
                  </div>
                ))}
              </div>
            ) : adminTab === 'reports' ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
                {reportCards.map(report => {
                  const Icon = report.icon;
                  return (
                    <div key={report.title} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                      <div className={`mb-5 inline-flex rounded-2xl p-3 ${toneClasses[report.tone]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-[#8896A4]">{report.title}</p>
                      <p className="mt-2 text-3xl font-black text-[#1A1F36]">{report.metric}</p>
                      <p className="mt-3 min-h-12 text-sm font-semibold leading-relaxed text-[#40516A]">{report.detail}</p>
                      <button onClick={() => {
                        if (report.title.includes('Revenue')) openAdminTab('payments');
                        else if (report.title.includes('Consultation')) openAdminTab('appointments');
                        else if (report.title.includes('Doctor')) openAdminTab('provider-wallets');
                        else if (report.title.includes('Membership')) openAdminTab('memberships');
                        else openAdminTab('patients');
                      }} className="mt-5 w-full rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1A1F36] transition-all hover:border-[#C4622D]/35 hover:text-[#C4622D]">
                        View Report
                      </button>
                    </div>
                  );
                })}
                <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)] xl:col-span-3">
                  <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-[#1A1F36]">Revenue and Payout Trend</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueVsPayoutData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8DED6" />
                        <XAxis dataKey="day" stroke="#8896A4" fontSize={11} />
                        <YAxis stroke="#8896A4" fontSize={11} />
                        <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #E8DED6' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#1A1F36" fill="#1A1F36" fillOpacity={0.12} />
                        <Area type="monotone" dataKey="payouts" stroke="#C4622D" fill="#C4622D" fillOpacity={0.16} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)] xl:col-span-2">
                  <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-[#1A1F36]">Report Coverage</h3>
                  <div className="space-y-3">
                    {['Revenue Report', 'Consultation Report', 'Doctor Performance', 'Membership Report', 'Patient Growth'].map(label => (
                      <div key={label} className="flex items-center justify-between rounded-2xl bg-[#F5F0EB]/60 p-4">
                        <span className="text-sm font-black text-[#40516A]">{label}</span>
                        <span className="rounded-full bg-[#5C7A6B]/12 px-3 py-1 text-xs font-black text-[#5C7A6B]">Ready</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : adminTab === 'notifications' ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
                {notificationCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                      <div className={`mb-4 inline-flex rounded-2xl p-3 ${toneClasses[card.tone]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-black text-[#1A1F36]">{card.title}</h3>
                      <p className="mt-1 text-xs font-black uppercase tracking-widest text-[#C4622D]">{card.audience}</p>
                      <p className="mt-3 text-sm font-semibold leading-relaxed text-[#40516A]">{card.detail}</p>
                      <button onClick={() => alert(`Compose ${card.title} campaign for ${card.audience}. Fill the campaign builder below and choose a channel to send.`)} className="mt-5 w-full rounded-xl bg-[#1A1F36] px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-[#11162A]">
                        Compose
                      </button>
                    </div>
                  );
                })}
                <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)] xl:col-span-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Campaign Builder</h3>
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input placeholder="Campaign name" className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/55 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C4622D]/20" />
                    <select className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/55 px-4 py-3 text-sm font-bold outline-none">
                      <option>Patient-only</option>
                      <option>Doctor-only</option>
                      <option>All users</option>
                    </select>
                    <input placeholder="Subject or push title" className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/55 px-4 py-3 text-sm font-bold outline-none md:col-span-2" />
                    <textarea placeholder="Message body" rows={5} className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/55 px-4 py-3 text-sm font-bold outline-none md:col-span-2" />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {['Broadcast Email', 'Push Notification', 'SMS'].map(label => (
                      <button key={label} onClick={() => alert(`${label} queued for review. Connect SMTP/SMS/push credentials in Platform Settings to send live campaigns.`)} className="rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1A1F36] hover:border-[#C4622D]/35 hover:text-[#C4622D]">{label}</button>
                    ))}
                  </div>
                </div>
                <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.07)] xl:col-span-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Template Library</h3>
                  <div className="mt-5 space-y-3">
                    {['Appointment confirmed', 'Consultation join reminder', 'Payment receipt', 'Plan selection prompt', 'Doctor payout update'].map(template => (
                      <div key={template} className="rounded-2xl bg-[#F5F0EB]/60 p-4 text-sm font-black text-[#40516A]">{template}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : adminTab === 'audit-logs' ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
                <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Tracked Events</h3>
                  <div className="mt-5 space-y-3">
                    {['Login', 'Payments', 'Appointments', 'Membership changes', 'Doctor actions', 'Admin actions', 'System settings changes'].map(label => (
                      <div key={label} className="flex items-center justify-between rounded-2xl bg-[#F5F0EB]/60 p-4">
                        <span className="text-sm font-black text-[#40516A]">{label}</span>
                        <span className="h-2 w-2 rounded-full bg-[#C4622D]" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-5 shadow-[0_12px_32px_rgba(26,31,54,0.07)]">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1F36]">Audit Timeline</h3>
                    <span className="rounded-full bg-[#1A1F36]/8 px-3 py-1 text-xs font-black text-[#1A1F36]">Immutable log view</span>
                  </div>
                  <div className="max-h-[620px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-3">
                      {auditLogRows.map(row => (
                        <div key={row.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB]/35 p-4 lg:grid-cols-[0.8fr_1fr_1fr_1.5fr_0.8fr] lg:items-center">
                          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${toneClasses[row.tone] || toneClasses.blue}`}>{row.category}</span>
                          <div><p className="text-sm font-black text-[#1A1F36]">{row.event}</p><p className="text-xs font-bold text-[#8896A4]">{row.actor}</p></div>
                          <p className="text-sm font-bold text-[#40516A]">{row.detail}</p>
                          <p className="text-xs font-bold text-[#8896A4] lg:col-span-2">{new Date(row.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-8 shadow-[0_12px_32px_rgba(26,31,54,0.08)]">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Admin Workspace</p>
                    <h3 className="mt-2 text-2xl font-black text-[#1A1F36]">Admin Profile</h3>
                    <p className="mt-2 text-sm font-semibold text-[#8896A4]">{adminUser?.email || 'Admin user'}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F5F0EB] p-4 text-[#C4622D]"><ShieldCheck className="h-8 w-8" /></div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {!selectedPatient && !activeCall ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="p-8 md:p-12 max-w-6xl mx-auto h-full flex flex-col"
              >
                <div className="mb-10">
                  <h2 className="text-4xl font-black text-[#1A1F36] tracking-tight mb-2">Dashboard Overview</h2>
                  <p className="text-[#5C7A6B] font-semibold">Track key metrics and recent platform activity.</p>
                </div>
                
                <motion.div 
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.1 }
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
                >
                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-6 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-lg shadow-[0_4px_20px_rgba(26,31,54,0.05)] border border-[#F5F0EB]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-50 text-orange-500 p-4 rounded-full"><Users className="w-6 h-6"/></div>
                      <h3 className="text-sm font-black text-[#5C7A6B] uppercase tracking-widest">Total Patients</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1A1F36]">{displayTotalPatients}</p>
                  </motion.div>
                  
                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-6 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-lg shadow-[0_4px_20px_rgba(26,31,54,0.05)] border border-[#F5F0EB]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-50 text-orange-500 p-4 rounded-full"><Stethoscope className="w-6 h-6"/></div>
                      <h3 className="text-sm font-black text-[#5C7A6B] uppercase tracking-widest">Total Doctors</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1A1F36]">{displayTotalDoctors}</p>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-6 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-lg shadow-[0_4px_20px_rgba(26,31,54,0.05)] border border-[#F5F0EB]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-50 text-orange-500 p-4 rounded-full"><Wallet className="w-6 h-6"/></div>
                      <h3 className="text-sm font-black text-[#5C7A6B] uppercase tracking-widest">Monthly Revenue</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1A1F36]">₹{monthlyRevenue.toLocaleString('en-IN')}</p>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-6 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-lg shadow-[0_4px_20px_rgba(26,31,54,0.05)] border border-[#F5F0EB]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-50 text-orange-500 p-4 rounded-full"><Activity className="w-6 h-6"/></div>
                      <h3 className="text-sm font-black text-[#5C7A6B] uppercase tracking-widest">Active Plans</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1A1F36]">{plans.length}</p>
                  </motion.div>
                </motion.div>

                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/40 rounded-[3rem] border border-white/60 shadow-sm p-10">
                  <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 border border-[#F5F0EB]"><Users className="w-12 h-12 text-[#5C7A6B]" /></div>
                  <h2 className="text-2xl font-black text-[#1A1F36] tracking-tight mb-2">Select a member</h2>
                  <p className="text-sm font-medium text-[#5C7A6B]">View detailed health profiles and manage sessions from the left sidebar.</p>
                </div>
              </motion.div>
            ) : !activeCall && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-6xl mx-auto">
                
                {/* ── MEMBER HEADER CARD ── */}
                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 mb-10 flex justify-between items-center transition-all hover:shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
                  <div>
                    <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter flex items-center gap-4"><div className="bg-indigo-100 text-indigo-600 p-3 rounded-[1.5rem]"><User className="w-8 h-8"/></div> {selectedPatient?.first_name || selectedPatient?.last_name ? `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim() : 'Anonymous Member'}</h2>
                    <div className="flex flex-wrap gap-5 text-slate-600 font-bold text-sm mt-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 inline-flex items-center">
                      <p className="flex items-center gap-2"><span className="text-slate-400">AGE</span> {selectedPatient.age || 'N/A'}</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <p className="flex items-center gap-2"><span className="text-slate-400">DOB</span> {selectedPatient.dob_day}/{selectedPatient.dob_month}/{selectedPatient.dob_year}</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <p className="flex items-center gap-2"><span className="text-slate-400">TEL</span> {selectedPatient.phone_number || 'N/A'}</p>
                    </div>
                    <p className="text-slate-500 font-semibold text-sm mt-5 pl-2 flex items-center gap-2"><HomeIcon className="w-4 h-4 text-slate-400"/> {selectedPatient.address || 'N/A'}</p>
                  </div>
                </div>

                {/* ── APPOINTMENT ALERT ── */}
                {(selectedPatient.booking_date || selectedPatient.booking_time) && (
                  <div className="bg-gradient-to-r from-amber-50 to-white border border-amber-200/60 p-8 rounded-[2.5rem] shadow-sm mb-10 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 left-0 w-3 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
                    <div>
                      <h3 className="text-amber-950 font-black text-2xl flex items-center gap-3 mb-2"><Clock className="w-7 h-7 text-amber-500"/> Scheduled Consultation</h3>
                      <p className="text-base font-bold text-amber-700/80">Member is waiting for this time slot.</p>
                    </div>
                    <div className="text-right bg-white px-8 py-5 rounded-3xl shadow-sm border border-amber-100 group-hover:scale-105 transition-transform">
                      <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">{selectedPatient.booking_time}</p>
                      <p className="text-amber-800 font-black mt-1 uppercase tracking-widest text-xs">{selectedPatient.booking_date}</p>
                    </div>
                  </div>
                )}

                {/* ── CARE TEAM ASSIGNMENT PANEL ── */}
                <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] mb-10">
                  <h3 className="text-indigo-900 font-black text-2xl flex items-center gap-3 mb-6"><Users className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Assigned Care Team</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Doctor Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-slate-400"/> Doctor (Physician)
                      </label>
                      <select
                        value={currentAssignment?.doctor_id || ''}
                        onChange={(e) => handleUpdateAssignment('doctor', e.target.value)}
                        disabled={updatingAssignment || assignmentLoading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      >
                        <option value="">Not Assigned</option>
                        {allStaff.filter(s => s.role === 'doctor').map(doc => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.first_name} {doc.last_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dietitian Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                        <Apple className="w-4 h-4 text-slate-400"/> Dietitian Specialist
                      </label>
                      <select
                        value={currentAssignment?.dietitian_id || ''}
                        onChange={(e) => handleUpdateAssignment('dietitian', e.target.value)}
                        disabled={updatingAssignment || assignmentLoading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      >
                        <option value="">Not Assigned</option>
                        {allStaff.filter(s => s.role === 'dietitian').map(diet => (
                          <option key={diet.id} value={diet.id}>
                            {diet.first_name} {diet.last_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Trainer Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                        <Dumbbell className="w-4 h-4 text-slate-400"/> Fitness Coach
                      </label>
                      <select
                        value={currentAssignment?.trainer_id || ''}
                        onChange={(e) => handleUpdateAssignment('trainer', e.target.value)}
                        disabled={updatingAssignment || assignmentLoading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      >
                        <option value="">Not Assigned</option>
                        {allStaff.filter(s => s.role === 'trainer').map(train => (
                          <option key={train.id} value={train.id}>
                            {train.first_name} {train.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(assignmentLoading || updatingAssignment) && (
                    <p className="text-xs font-bold text-indigo-500 mt-4 animate-pulse">Syncing assignments with database...</p>
                  )}
                </div>

                {/* ── DOCTOR PRESCRIPTION PANEL ── */}
                <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] mb-10">
                  <h3 className="text-indigo-900 font-black text-2xl flex items-center gap-3 mb-8"><Stethoscope className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Prescribe Medication</h3>
                  {selectedPatient.prescription_type ? (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-900 p-6 rounded-[2rem] font-black flex items-center gap-4 text-xl shadow-sm">
                      <div className="bg-emerald-500 text-white p-2 rounded-full"><CheckCircle2 className="w-6 h-6"/></div> Order placed successfully for <span className="underline decoration-emerald-300 underline-offset-4">{selectedPatient.prescription_type.toUpperCase()} MEDICINE</span>
                    </div>
                  ) : (
                    <div className="flex gap-6">
                      <button onClick={() => handlePrescription('INJECTABLE')} disabled={prescribeLoading} className="flex-1 bg-white hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-400 text-indigo-900 font-black py-6 rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center gap-4 group">
                        <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full group-hover:scale-110 transition-transform"><Syringe className="w-8 h-8"/></div>
                        <span className="text-lg">Injectable Medicine</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ── STATS GRID ── */}
                <div className="grid grid-cols-4 gap-6 mb-10">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Scale className="w-4 h-4"/> Current Weight</p>
                    <p className="text-4xl font-black text-slate-800">{selectedPatient.weight_kg} <span className="text-xl text-slate-400 font-bold">kg</span></p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -z-10"></div>
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Target className="w-4 h-4"/> Goal Weight</p>
                    <p className="text-4xl font-black text-indigo-600">{selectedPatient.goal_weight_kg} <span className="text-xl text-indigo-400/60 font-bold">kg</span></p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Activity className="w-4 h-4"/> Height</p>
                    <p className="text-4xl font-black text-slate-800">{selectedPatient.height_cm} <span className="text-xl text-slate-400 font-bold">cm</span></p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><User className="w-4 h-4"/> Gender</p>
                    <p className="text-3xl font-black text-slate-800 capitalize mt-1">{selectedPatient.medical_history?.gender}</p>
                  </div>
                </div>

                {/* ── SESSION MONITOR ── */}
                <div className="mb-10">
                  <h3 className="text-2xl font-black text-[#1A1F36] mb-6 flex items-center gap-3"><Video className="w-6 h-6 text-indigo-600"/> Live Session Monitor</h3>
                  <SessionMonitor memberId={selectedPatient.id} />
                </div>

                {/* ── GRAPH SECTION ── */}
                <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10 mb-10">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><Activity className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Weight Loss Track</h3>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={patientLogs} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dy={15} />
                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dx={-15} />
                        <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.15)', padding: '16px' }} labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '8px' }} />
                        <Line type="monotone" dataKey="weight" stroke="url(#colorUvAdmin)" strokeWidth={5} dot={{ r: 7, fill: '#4f46e5', strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 10, strokeWidth: 0, fill: '#4f46e5' }} />
                        <defs>
                          <linearGradient id="colorUvAdmin" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#4f46e5" />
                          </linearGradient>
                        </defs>
                        {selectedPatient.goal_weight_kg && (
                          <ReferenceLine 
                            y={parseFloat(selectedPatient.goal_weight_kg)} 
                            stroke="#10B981" 
                            strokeDasharray="8 8" 
                            strokeWidth={2}
                            label={{ position: 'top', value: 'Target Goal', fill: '#10B981', fontSize: 13, fontWeight: '900' }} 
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── DIET & FITNESS DATA ── */}
                {hasDietFitnessData && (
                  <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mb-10">
                    <div className="bg-slate-900 px-10 py-6 flex items-center justify-between">
                      <h3 className="text-xl font-black text-white flex items-center gap-3"><Apple className="w-6 h-6 text-amber-400"/> Diet & Fitness Preferences</h3>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                      </div>
                    </div>
                    <div className="p-10 grid grid-cols-2 gap-x-12 gap-y-8">
                      {hasLocalFood && (
                        <div className="col-span-1">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Apple className="w-4 h-4"/> Local Food Consumed</p>
                          <p className="font-bold text-slate-800 text-lg bg-slate-50 p-6 rounded-3xl border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner">{selectedPatient.local_food}</p>
                        </div>
                      )}
                      {hasWorkoutPref && (
                        <div className="col-span-1">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Dumbbell className="w-4 h-4"/> Workout Preference</p>
                          <div className="font-black text-slate-800 text-xl bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-5 shadow-inner">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                              {selectedPatient.workout_preference === 'home' ? <HomeIcon className="w-8 h-8 text-emerald-500"/> : <Dumbbell className="w-8 h-8 text-emerald-500"/>}
                            </div>
                            <span className="capitalize">{selectedPatient.workout_preference} Workout</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── MEDICAL HISTORY ── */}
                <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mb-10">
                  <div className="bg-gradient-to-r from-indigo-900 to-slate-900 px-10 py-6">
                    <h3 className="text-xl font-black text-white flex items-center gap-3"><FileText className="w-6 h-6 text-indigo-400"/> Full Medical Profile</h3>
                  </div>
                  <div className="p-10 grid grid-cols-2 gap-x-12 gap-y-10">
                    
                    {/* Column 1 */}
                    <div className="space-y-8">
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> Blood Pressure</p>
                        <p className="font-black text-slate-800 text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">{selectedPatient.medical_history?.vitals?.bp || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> Resting Heart Rate</p>
                        <p className="font-black text-slate-800 text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">{selectedPatient.medical_history?.vitals?.hr || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tried Weight Program Before?</p>
                        <p className="font-black text-slate-800 text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">{selectedPatient.tried_weight_program ? 'Yes' : 'No'}</p>
                      </div>
                      {selectedPatient.extra_medical_info && (
                        <div>
                          <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Extra Medical Info</p>
                          <p className="font-bold text-rose-900 bg-rose-50 p-5 rounded-2xl border border-rose-200 leading-relaxed shadow-sm">{selectedPatient.extra_medical_info}</p>
                        </div>
                      )}
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-8">
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Pill className="w-4 h-4"/> Prior Medications</p>
                        <p className="font-black text-slate-800 text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner capitalize">{selectedPatient.medical_history?.medication_history?.type === 'none' ? 'None' : (selectedPatient.medical_history?.medication_history?.type || 'N/A')}</p>
                      </div>
                      {selectedPatient.medical_history?.medication_history?.type !== 'none' && selectedPatient.medical_history?.medication_history?.details && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Medication Details</p>
                          <p className="font-bold text-indigo-900 bg-indigo-50 p-5 rounded-2xl border border-indigo-200 leading-relaxed shadow-sm">{selectedPatient.medical_history?.medication_history?.details}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Takes Prescription Meds?</p>
                        <p className={`font-black text-lg p-4 rounded-2xl border inline-flex items-center gap-3 shadow-sm ${selectedPatient.medical_history?.takes_prescription_meds ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-800 shadow-inner'}`}>
                          {selectedPatient.medical_history?.takes_prescription_meds ? <CheckCircle2 className="w-5 h-5 text-amber-500"/> : null} 
                          {selectedPatient.medical_history?.takes_prescription_meds ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>

                    {/* ── HEALTH CONDITIONS 2 DISPLAY ── */}
                    {selectedPatient.health_conditions_two && selectedPatient.health_conditions_two.length > 0 && (
                      <div className="col-span-2 border-t border-slate-100 pt-8 mt-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><Activity className="w-4 h-4"/> Other Health Conditions</p>
                        <div className="flex flex-wrap gap-3">
                          {selectedPatient.health_conditions_two.map((condition: string, i: number) => (
                            <span key={i} className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors cursor-default shadow-sm">
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── GLP-1 IMAGE UPLOAD DISPLAY ── */}
                    {selectedPatient.glp1_image_url && (
                      <div className="col-span-2 border-t border-slate-100 pt-8 mt-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><FileText className="w-4 h-4"/> GLP-1 Medication Document</p>
                        <a href={selectedPatient.glp1_image_url} target="_blank" rel="noopener noreferrer" className="inline-block relative group">
                          <img 
                            src={selectedPatient.glp1_image_url} 
                            alt="GLP-1 Medication" 
                            className="max-w-md rounded-3xl shadow-md border-4 border-slate-100 group-hover:border-indigo-200 transition-all duration-300" 
                          />
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors rounded-3xl flex items-center justify-center">
                            <span className="bg-white text-indigo-600 font-bold py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg transform translate-y-2 group-hover:translate-y-0">View Full Size</span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F0EB]" />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
