import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Layout,
  Banknote,
  PiggyBank,
  HeartHandshake,
  ShieldCheck,
  CreditCard,
  Download,
  AlertCircle,
  Bell,
  LogOut,
  Sliders,
  DollarSign
} from 'lucide-react';
import { PaymentStatus } from '../../../shared/src/types';

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loans' | 'chits' | 'profile'>('dashboard');

  // Customer detailed profile
  const [profile, setProfile] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [allChitGroups, setAllChitGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Application States
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState({
    loanType: 'PERSONAL',
    principal: '',
    tenorMonths: '12',
    collateralDescription: '',
    guarantorName: '',
    guarantorPhone: '',
    collateralUrl: ''
  });

  const [showLicModal, setShowLicModal] = useState(false);
  const [licForm, setLicForm] = useState({
    planName: 'Jeevan Labh (836)',
    sumAssured: '',
    premiumAmount: '',
    premiumMode: 'YEARLY'
  });

  // Forms
  const [payAmount, setPayAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    address: '',
    nomineeName: '',
    nomineeRelation: '',
    nomineePhone: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadCustomerData();
  }, [user]);

  async function loadCustomerData() {
    let profileId = user?.customerProfileId;

    try {
      setLoading(true);

      // Backup fallback search by email if profile ID is missing on user context
      if (!profileId && user?.email) {
        const searchRes = await axios.get(`/api/customers?search=${encodeURIComponent(user.email)}`);
        if (searchRes.data?.data && searchRes.data.data.length > 0) {
          profileId = searchRes.data.data[0].id;
        }
      }

      if (!profileId) {
        setLoading(false);
        return;
      }

      const [profileRes, timelineRes, chitsRes] = await Promise.all([
        axios.get(`/api/customers/${profileId}`),
        axios.get(`/api/customers/${profileId}/timeline`),
        axios.get('/api/chits')
      ]);
      setProfile(profileRes.data);
      setTimeline(timelineRes.data);
      setAllChitGroups(chitsRes.data);
      setEditProfileForm({
        address: profileRes.data.address || '',
        nomineeName: profileRes.data.nomineeName || '',
        nomineeRelation: profileRes.data.nomineeRelation || '',
        nomineePhone: profileRes.data.nomineePhone || ''
      });
    } catch (err) {
      console.error('Failed to load customer profile details', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handlePayEmi = async (loanId: string, emiId: string, defaultAmount: number) => {
    try {
      setActionLoading(true);
      await axios.post(`/api/loans/${loanId}/emi/${emiId}/pay`, {
        amount: defaultAmount
      });
      alert('EMI Payment received successfully! Receipt has been registered in the system.');
      await loadCustomerData();
    } catch (err) {
      console.error('EMI pay failure', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayChitInstallment = async (chitGroupId: string, instId: string, defaultAmount: number) => {
    try {
      setActionLoading(true);
      await axios.post(`/api/chits/${chitGroupId}/installment/${instId}/pay`, {
        amount: defaultAmount
      });
      alert('Chit installment payment completed successfully!');
      await loadCustomerData();
    } catch (err) {
      console.error('Chit pay failure', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.customerProfileId) return;
    try {
      setActionLoading(true);
      await axios.put(`/api/customers/${user.customerProfileId}`, editProfileForm);
      alert('Profile updated and resubmitted for KYC review.');
      await loadCustomerData();
    } catch (err) {
      console.error('Failed to update profile details', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await axios.post('/api/loans/apply', {
        customerId: profile.id,
        loanType: loanForm.loanType,
        principal: parseFloat(loanForm.principal),
        interestRate: 12.0, // standard annual rate
        tenorMonths: parseInt(loanForm.tenorMonths, 10),
        collateralDescription: loanForm.collateralDescription || 'None Provided',
        guarantorName: loanForm.guarantorName || 'None',
        guarantorPhone: loanForm.guarantorPhone || 'None',
        collateralUrl: loanForm.collateralUrl || ''
      });
      alert('Loan application and collateral details submitted successfully to Swaraj operators!');
      setShowLoanModal(false);
      setLoanForm({
        loanType: 'PERSONAL',
        principal: '',
        tenorMonths: '12',
        collateralDescription: '',
        guarantorName: '',
        guarantorPhone: '',
        collateralUrl: ''
      });
      await loadCustomerData();
    } catch (err) {
      console.error('Failed to submit loan application', err);
      alert('Error submitting loan application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyLic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const policyNo = `LIC-REQ-${Math.floor(100000 + Math.random() * 900000)}`;
      await axios.post('/api/lic', {
        customerId: profile.id,
        policyNumber: policyNo,
        planName: licForm.planName,
        sumAssured: parseFloat(licForm.sumAssured),
        premiumAmount: parseFloat(licForm.premiumAmount),
        premiumMode: licForm.premiumMode,
        startDate: new Date(),
        commissionRate: 15.0
      });
      alert(`LIC Policy ${policyNo} registered successfully! You can pay premium renewals on the portal.`);
      setShowLicModal(false);
      setLicForm({
        planName: 'Jeevan Labh (836)',
        sumAssured: '',
        premiumAmount: '',
        premiumMode: 'YEARLY'
      });
      await loadCustomerData();
    } catch (err) {
      console.error('Failed to register LIC policy', err);
      alert('Error registering LIC policy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinChitGroup = async (groupId: string) => {
    try {
      setActionLoading(true);
      await axios.post(`/api/chits/${groupId}/join`, {
        customerId: profile.id
      });
      alert('Successfully joined the Chit Fund Group! A subscriber slot has been allocated.');
      await loadCustomerData();
    } catch (err: any) {
      console.error('Failed to join chit group', err);
      alert(err.response?.data?.error || 'Error joining chit group.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <ShieldCheck size={48} className="mx-auto text-primary animate-bounce" />
          <p className="text-sm font-semibold">Configuring Customer Portal...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="text-center max-w-sm space-y-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <AlertCircle size={48} className="mx-auto text-destructive animate-pulse" />
          <h2 className="text-lg font-bold text-white">Profile Configuration Error</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            We were unable to load your customer profile context. Please contact support or try logging out and logging back in.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-destructive hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans w-full relative overflow-hidden">
      
      {/* Responsive Header */}
      <header className="sticky top-0 bg-[#0b192c] border-b border-slate-900 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Swaraj Private Limited Logo" className="h-8 rounded bg-white p-0.5 object-contain" />
              <div>
                <h1 className="text-[10px] font-extrabold text-white tracking-tight uppercase">Swaraj Pvt. Ltd.</h1>
                <span className="text-[7px] text-slate-400 uppercase tracking-widest block font-bold">Customer Portal</span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl text-[10px] font-bold border border-slate-800">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('loans')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'loans' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Active Loans
              </button>
              <button
                onClick={() => setActiveTab('chits')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'chits' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Chit Groups
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
              >
                My Profile
              </button>
            </nav>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 bg-slate-800/40 hover:bg-destructive hover:text-white rounded-lg transition-colors text-[9px] font-bold flex items-center gap-1.5 border border-slate-800/50"
          >
            <LogOut size={11} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Main Tab Contents */}
      <main className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left column: Welcome and Metrics */}
              <div className="lg:col-span-2 space-y-6">
                {/* Welcome banner */}
                <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl relative overflow-hidden space-y-2">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                  <h2 className="text-sm font-bold text-white">Welcome back, {user?.fullName}!</h2>
                  <p className="text-[10px] text-slate-300 leading-normal">
                    Manage your active chits, pay EMI installments, or verify nominee records.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 bg-black/30 w-fit px-2.5 py-1 rounded text-[8px] font-bold uppercase">
                    <span className={`w-1.5 h-1.5 rounded-full ${profile.kycStatus === 'VERIFIED' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                    <span>KYC: {profile.kycStatus}</span>
                  </div>
                </div>

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Active loan */}
                  <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Active Loan Balance</span>
                    <span className="text-base font-extrabold text-white">
                      Rs. {profile.loans.reduce((sum: number, l: any) => sum + l.outstandingBalance, 0).toLocaleString()}
                    </span>
                  </div>
                  {/* Active chit value */}
                  <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Active Chit Holdings</span>
                    <span className="text-base font-extrabold text-white">
                      Rs. {profile.chits.reduce((sum: number, c: any) => sum + c.chitGroup.groupValue, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right column: LIC policy & Notification timeline */}
              <div className="space-y-6">
                {/* Active LIC Policy banner */}
                {profile.licPolicies.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">LIC: {profile.licPolicies[0].planName}</span>
                      <span className="text-[10px] text-orange-400">Due: {new Date(profile.licPolicies[0].dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Policy No: {profile.licPolicies[0].policyNumber}</span>
                      <span>Premium: Rs. {profile.licPolicies[0].premiumAmount}</span>
                    </div>
                  </div>
                )}

                {/* Request/Buy LIC Policy Card */}
                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200">Explore & Purchase LIC Plan</span>
                    <button
                      type="button"
                      onClick={() => setShowLicModal(!showLicModal)}
                      className="bg-primary hover:bg-blue-600 text-white text-[9px] font-bold px-2.5 py-1 rounded"
                    >
                      {showLicModal ? 'Close Form' : 'Purchase Plan'}
                    </button>
                  </div>
                  
                  {showLicModal ? (
                    <form onSubmit={handleBuyLic} className="space-y-3 mt-2 text-[10px]">
                      <div>
                        <label className="font-semibold text-slate-400 block mb-1 text-[9px]">LIC Plan Type</label>
                        <select
                          value={licForm.planName}
                          onChange={(e) => setLicForm({ ...licForm, planName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                        >
                          <option value="Jeevan Labh (836)">Jeevan Labh (836)</option>
                          <option value="Jeevan Anand (915)">Jeevan Anand (915)</option>
                          <option value="Jeevan Umang (945)">Jeevan Umang (945)</option>
                          <option value="Tech Term Insurance Plan">Tech Term Insurance</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-400 block mb-1 text-[9px]">Sum Assured (Rs.)</label>
                          <input
                            type="number"
                            placeholder="e.g. 500000"
                            value={licForm.sumAssured}
                            onChange={(e) => setLicForm({ ...licForm, sumAssured: e.target.value })}
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-400 block mb-1 text-[9px]">Premium Amount (Rs.)</label>
                          <input
                            type="number"
                            placeholder="e.g. 15000"
                            value={licForm.premiumAmount}
                            onChange={(e) => setLicForm({ ...licForm, premiumAmount: e.target.value })}
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-400 block mb-1 text-[9px]">Premium Mode</label>
                        <select
                          value={licForm.premiumMode}
                          onChange={(e) => setLicForm({ ...licForm, premiumMode: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                        >
                          <option value="MONTHLY">Monthly</option>
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="HALF_YEARLY">Half Yearly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded text-[10px] transition-colors"
                      >
                        {actionLoading ? 'Processing...' : 'Confirm Policy Registration'}
                      </button>
                    </form>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Explore Swaraj's LIC insurance plans and register a policy instantly on your profile.
                    </p>
                  )}
                </div>

                {/* Notification timeline alerts logs */}
                <div className="space-y-2.5">
                   <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest border-l-2 border-primary pl-2">Recent Notifications</h3>
                   
                   {timeline.filter(e => e.type.startsWith('NOTIF_')).length === 0 ? (
                     <p className="text-[10px] text-slate-500">No recent notifications received.</p>
                   ) : (
                     <div className="space-y-2">
                       {timeline.filter(e => e.type.startsWith('NOTIF_')).slice(0, 3).map((event, idx) => (
                         <div key={idx} className="bg-slate-900/50 border border-slate-900 p-3 rounded-lg text-[10px] flex gap-2">
                           <div className="text-primary mt-0.5"><Bell size={12} /></div>
                           <div>
                             <p className="font-semibold text-slate-300">{event.title}</p>
                             <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">{event.description}</p>
                             <span className="text-[8px] text-slate-600 block mt-1">{new Date(event.date).toLocaleDateString()}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: LOANS & EMIS */}
        {activeTab === 'loans' && (
          <div className="space-y-4 fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-white">Your Active Loan Files</h2>
              <button
                type="button"
                onClick={() => setShowLoanModal(!showLoanModal)}
                className="bg-primary hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors border border-slate-800"
              >
                {showLoanModal ? 'Cancel Application' : 'Apply for a Loan'}
              </button>
            </div>

            {showLoanModal && (
              <form onSubmit={handleApplyLoan} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4 text-xs max-w-lg">
                <h3 className="font-bold text-white text-xs border-b border-slate-800 pb-1.5">New Loan Request Form</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Loan Type</label>
                    <select
                      value={loanForm.loanType}
                      onChange={(e) => setLoanForm({ ...loanForm, loanType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="PERSONAL">Personal Loan</option>
                      <option value="GOLD">Gold Loan</option>
                      <option value="BUSINESS">Business Loan</option>
                      <option value="VEHICLE">Vehicle Loan</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Requested Capital (Rs.)</label>
                    <input
                      type="number"
                      placeholder="e.g. 100000"
                      value={loanForm.principal}
                      onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Tenor (Months)</label>
                    <select
                      value={loanForm.tenorMonths}
                      onChange={(e) => setLoanForm({ ...loanForm, tenorMonths: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="6">6 Months (12% Int)</option>
                      <option value="12">12 Months (12% Int)</option>
                      <option value="24">24 Months (12% Int)</option>
                      <option value="36">36 Months (12% Int)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Collateral details</label>
                    <input
                      type="text"
                      placeholder="Aadhaar card, vehicle etc."
                      value={loanForm.collateralDescription}
                      onChange={(e) => setLoanForm({ ...loanForm, collateralDescription: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Guarantor Name</label>
                    <input
                      type="text"
                      placeholder="Guarantor Full Name"
                      value={loanForm.guarantorName}
                      onChange={(e) => setLoanForm({ ...loanForm, guarantorName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Guarantor Contact Phone</label>
                    <input
                      type="text"
                      placeholder="Guarantor phone number"
                      value={loanForm.guarantorPhone}
                      onChange={(e) => setLoanForm({ ...loanForm, guarantorPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Collateral Document URL / File Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. https://drive.google.com/file/d/collateral-pdf"
                    value={loanForm.collateralUrl}
                    onChange={(e) => setLoanForm({ ...loanForm, collateralUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  {actionLoading ? 'Submitting request...' : 'Confirm Loan Request'}
                </button>
              </form>
            )}

            {profile.loans.length === 0 ? (
              <p className="text-xs text-slate-500">No active loans found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.loans.map((loan: any) => (
                  <div key={loan.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs text-white">{loan.loanType} Loan</h3>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            loan.status === 'DISBURSED' ? 'bg-green-500/10 text-green-500' :
                            loan.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-500' :
                            loan.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>{loan.status}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 block">File ID: {loan.id.substring(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-primary block">Rs. {loan.outstandingBalance.toLocaleString()}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase inline-block mt-0.5 ${
                          loan.collateralStatus === 'VERIFIED' ? 'bg-green-500/10 text-green-500' :
                          loan.collateralStatus === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>Collateral: {loan.collateralStatus}</span>
                      </div>
                    </div>
                    
                    {/* Collateral details preview */}
                    <div className="bg-slate-950/40 p-2.5 rounded-lg text-[10px] space-y-1">
                      <p className="text-slate-400 font-semibold">Collateral Information</p>
                      <p className="text-slate-300">Desc: {loan.collateralDescription || 'Not Provided'}</p>
                      {loan.collateralUrl && (
                        <p className="text-slate-500 truncate text-[9px]">
                          Doc: <a href={loan.collateralUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{loan.collateralUrl}</a>
                        </p>
                      )}
                    </div>

                    {/* List unpaid EMI */}
                    <div className="space-y-2 text-[10px]">
                      <span className="font-bold text-slate-400">Monthly Installment Checklist</span>
                      
                      {loan.emiInstallments?.length === 0 ? (
                        <p className="text-[9px] text-slate-500">Schedule loading or not disbursed yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {loan.emiInstallments?.map((emi: any) => (
                            <div key={emi.id} className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                              <div>
                                <p className="font-semibold text-slate-300">EMI #{emi.installmentNo} &bull; Rs. {emi.totalAmount}</p>
                                <span className="text-[8px] text-slate-500">Due Date: {new Date(emi.dueDate).toLocaleDateString()}</span>
                              </div>
                              
                              {emi.status === 'PAID' ? (
                                <span className="text-[8px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-extrabold">PAID</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePayEmi(loan.id, emi.id, emi.totalAmount)}
                                  disabled={actionLoading}
                                  className="bg-primary hover:bg-blue-600 text-white font-bold px-2.5 py-1 rounded text-[9px] transition-colors"
                                >
                                  Pay Now
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHIT FUNDS */}
        {activeTab === 'chits' && (
          <div className="space-y-4 fade-in">
            <h2 className="text-sm font-extrabold text-white">Your Chit Fund Subscriptions</h2>
            
            {profile.chits.length === 0 ? (
              <p className="text-xs text-slate-500">You are not enrolled in any chit groups.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.chits.map((membership: any) => {
                  const group = membership.chitGroup;
                  const groupInstallments = group.installments?.filter((inst: any) => inst.customerId === profile.id) || [];
                  
                  return (
                    <div key={membership.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div>
                          <h3 className="font-bold text-xs text-white">{group.name}</h3>
                          <span className="text-[9px] text-slate-400">Allocated Slot Slot #{membership.slotNumber}</span>
                        </div>
                        <span className="text-xs font-bold text-primary">Rs. {group.groupValue.toLocaleString()}</span>
                      </div>

                      <div className="space-y-2 text-[10px]">
                        <span className="font-bold text-slate-400">Monthly Contribution Dues</span>
                        {groupInstallments.length === 0 ? (
                           <p className="text-[9px] text-slate-500">No installments due yet.</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {groupInstallments.map((inst: any) => (
                              <div key={inst.id} className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                                <div>
                                  <p className="font-semibold text-slate-300">Round #{inst.installmentNo} &bull; Rs. {inst.dueAmount}</p>
                                  <span className="text-[8px] text-slate-500">Due: {new Date(inst.dueDate).toLocaleDateString()}</span>
                                </div>
                                
                                {inst.status === 'PAID' ? (
                                  <span className="text-[8px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-extrabold">PAID</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handlePayChitInstallment(group.id, inst.id, inst.dueAmount)}
                                    disabled={actionLoading}
                                    className="bg-primary hover:bg-blue-600 text-white font-bold px-2.5 py-1 rounded text-[9px]"
                                  >
                                    Pay
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Available Chits to Join Section */}
            <div className="space-y-4 pt-6 border-t border-slate-800/80">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-primary">Available Chits to Join</h3>
              
              {(() => {
                const enrolledGroupIds = profile.chits.map((c: any) => c.chitGroupId);
                const joinableGroups = allChitGroups.filter((g: any) => !enrolledGroupIds.includes(g.id) && g.status === 'ACTIVE');

                if (joinableGroups.length === 0) {
                  return <p className="text-[10px] text-slate-500">No new active chit groups available for enrollment.</p>;
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {joinableGroups.map((group: any) => (
                      <div key={group.id} className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <h4 className="font-bold text-slate-200">{group.name}</h4>
                          <p className="text-[9px] text-slate-500 mt-1">
                            Value: Rs. {group.groupValue.toLocaleString()} &bull; Duration: {group.durationMonths} Mo
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJoinChitGroup(group.id)}
                          disabled={actionLoading}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg text-[9px] transition-colors border border-slate-800"
                        >
                          Join Group
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* TAB 4: PROFILE & KYC */}
        {activeTab === 'profile' && (
          <div className="space-y-4 fade-in">
            <h2 className="text-sm font-extrabold text-white">Your Profile & Nominee Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document preview status */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-3 h-fit">
                <span className="font-bold text-slate-400 block border-b border-slate-800 pb-1.5">KYC Document Records</span>
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aadhaar Card ID</span>
                    <code className="font-semibold text-white">{profile.aadhaar}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PAN Card ID</span>
                    <code className="font-semibold text-white">{profile.pan}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profile Income/Mo</span>
                    <span className="font-semibold text-white">Rs. {profile.monthlyIncome.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Edit details form */}
              <form onSubmit={handleUpdateProfile} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4 text-xs">
                <span className="font-bold text-slate-400 block border-b border-slate-800 pb-1.5">Update Information coordinates</span>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Permanent Address</label>
                  <textarea
                    value={editProfileForm.address}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary h-16 resize-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Nominee Full Name</label>
                  <input
                    type="text"
                    value={editProfileForm.nomineeName}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, nomineeName: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Nominee Relationship</label>
                    <input
                      type="text"
                      value={editProfileForm.nomineeRelation}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, nomineeRelation: e.target.value })}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1 text-[10px]">Nominee Contact Phone</label>
                    <input
                      type="text"
                      value={editProfileForm.nomineePhone}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, nomineePhone: e.target.value })}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg text-xs"
                >
                  {actionLoading ? 'Saving...' : 'Update Details'}
                </button>

              </form>
            </div>
          </div>
        )}

      </main>

      {/* Floating Bottom Nav Menu (Visible only on mobile devices) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0b192c] border-t border-slate-900 h-16 flex items-center justify-around z-40">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold ${
            activeTab === 'dashboard' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <Layout size={18} />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold ${
            activeTab === 'loans' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <Banknote size={18} />
          <span>Loans</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chits')}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold ${
            activeTab === 'chits' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <PiggyBank size={18} />
          <span>Chits</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold ${
            activeTab === 'profile' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <User size={18} />
          <span>Profile</span>
        </button>
      </nav>

    </div>
  );
}
