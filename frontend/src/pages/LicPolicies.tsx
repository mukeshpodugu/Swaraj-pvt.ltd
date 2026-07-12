import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  HeartHandshake,
  PlusCircle,
  Bell,
  CheckCircle,
  Clock,
  DollarSign,
  Briefcase,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

export default function LicPolicies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    customerId: '',
    policyNumber: '',
    planName: '',
    sumAssured: '',
    premiumAmount: '',
    premiumMode: 'YEARLY',
    startDate: '',
    agentId: '',
    commissionRate: '15.0'
  });

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPolicies();
    loadAlerts();
    loadDropdowns();
  }, []);

  async function loadPolicies() {
    try {
      setLoading(true);
      const res = await axios.get('/api/lic');
      setPolicies(res.data);
    } catch (err) {
      console.error('Failed to load LIC policies', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAlerts() {
    try {
      const res = await axios.get('/api/lic/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to load renewal alerts', err);
    }
  }

  async function loadDropdowns() {
    try {
      const [custRes, userRes] = await Promise.all([
        axios.get('/api/customers'),
        axios.get('/api/auth/refresh') // simple trick to get access check or we'll get agents from DB
      ]);
      setCustomers(custRes.data.data);
      
      // Fetch agents (retrieve users list and filter where role is AGENT)
      // For sandbox default, we'll create a static list or load if admin list endpoint was there.
      // We can query custom endpoint if we had one. Let's make an API call to settings logs to extract users,
      // or we can mock/static agent details because sandbox user has agent seeded.
      setAgents([
        { id: 'agent-seeded-id-1', fullName: 'Suresh Kumar' } // maps to seeded agent
      ]);
    } catch (err) {
      console.error('Failed to load dropdown directories', err);
    }
  }

  const handlePayPremium = async (policyId: string) => {
    try {
      setActionLoading(true);
      await axios.post(`/api/lic/${policyId}/pay-premium`);
      await loadPolicies();
      await loadAlerts();
      if (selectedPolicy && selectedPolicy.id === policyId) {
        const refreshed = policies.find((p) => p.id === policyId);
        setSelectedPolicy(refreshed || null);
      }
    } catch (err) {
      console.error('Failed to pay premium', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      // If agent selection is empty, pass null
      const payload = {
        ...form,
        agentId: form.agentId || undefined
      };
      await axios.post('/api/lic', payload);
      setShowRegisterModal(false);
      setForm({
        customerId: '',
        policyNumber: '',
        planName: '',
        sumAssured: '',
        premiumAmount: '',
        premiumMode: 'YEARLY',
        startDate: '',
        agentId: '',
        commissionRate: '15.0'
      });
      await loadPolicies();
      await loadAlerts();
    } catch (err) {
      console.error('Failed to register policy', err);
    } finally {
      setActionLoading(false);
    }
  };

  const selectPolicy = (p: any) => {
    // Re-find from state to ensure history is updated
    const full = policies.find((item) => item.id === p.id);
    setSelectedPolicy(full || p);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 fade-in">
      
      {/* Listing Panel */}
      <div className={`xl:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 ${
        selectedPolicy ? 'hidden xl:block' : 'block'
      }`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">LIC Policies Registry</h2>
            <p className="text-xs text-muted-foreground">Register new coverage, check upcoming dues renewals, and trace commissions logs.</p>
          </div>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
          >
            <PlusCircle size={15} />
            <span>Register LIC Policy</span>
          </button>
        </div>

        {/* Renewal Alerts Banner Box */}
        {alerts.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3 text-orange-500 text-xs">
            <AlertTriangle size={18} className="mt-0.5" />
            <div>
              <p className="font-bold">Renewal Alerts: {alerts.length} Policy Premiums Expiring</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                The following policies are due within the next 30 days. Send WhatsApp automated notifications to subscribers.
              </p>
            </div>
          </div>
        )}

        {/* Data Grid list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <HeartHandshake size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold">No Policies Registered</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] font-semibold text-muted-foreground uppercase">
                  <th className="pb-3">Policy No</th>
                  <th className="pb-3">Insured Customer</th>
                  <th className="pb-3">Plan Name</th>
                  <th className="pb-3 text-right">Premium Due</th>
                  <th className="pb-3 text-center">Due Date</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {policies.map((p) => {
                  const isDueSoon = new Date(p.dueDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-4 font-semibold text-muted-foreground">
                        {p.policyNumber}
                      </td>
                      <td className="py-4 font-bold">
                        {p.customer.user.fullName}
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {p.planName}
                      </td>
                      <td className="py-4 text-right font-semibold">
                        Rs. {p.premiumAmount.toLocaleString()} <span className="text-[9px] font-normal text-muted-foreground">({p.premiumMode})</span>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`font-semibold ${isDueSoon ? 'text-orange-500 font-bold' : ''}`}>
                          {new Date(p.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          p.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => selectPolicy(p)}
                          className="bg-accent hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Details Side panel */}
      {selectedPolicy && (
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 fade-in">
          
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Policy Audit Folder</h3>
            <button
              onClick={() => setSelectedPolicy(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Close [X]
            </button>
          </div>

          {/* Quick Details Card */}
          <div className="bg-accent/30 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Insured</span>
              <span className="font-bold">{selectedPolicy.customer?.user?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sum Assured</span>
              <span className="font-semibold">Rs. {selectedPolicy.sumAssured?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Premium Value</span>
              <span className="font-extrabold text-primary">Rs. {selectedPolicy.premiumAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Cycle</span>
              <span className="font-semibold">{selectedPolicy.premiumMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Due Date</span>
              <span className="font-semibold text-orange-500">{new Date(selectedPolicy.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1">
              <span className="text-muted-foreground">Field Agent</span>
              <span className="font-semibold">{selectedPolicy.agent?.fullName || 'Direct Sale'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comm rate</span>
              <span className="font-semibold text-green-600">{selectedPolicy.commissionRate}% commission</span>
            </div>
          </div>

          {/* Collect Premium button */}
          {selectedPolicy.status !== 'MATURED' && (
            <button
              onClick={() => handlePayPremium(selectedPolicy.id)}
              disabled={actionLoading}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg text-xs transition-colors"
            >
              💵 Collect & Record Premium Payment
            </button>
          )}

          {/* Premium History */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2">Premium Receipts History</h4>
            
            {selectedPolicy.premiumHistory?.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {selectedPolicy.premiumHistory?.map((hist: any) => (
                  <div key={hist.id} className="border border-border p-2.5 rounded-lg text-[10px] space-y-1 bg-accent/20">
                    <div className="flex justify-between font-bold">
                      <span>Receipt Confirmed</span>
                      <span className="text-green-500">SUCCESS</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Paid: {new Date(hist.paidDate).toLocaleString()}</span>
                      <span>Amt: Rs. {hist.premiumAmount}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/40 font-semibold text-muted-foreground">
                      <span>Agent Commission</span>
                      <span className="text-foreground">Rs. {hist.agentCommission}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Register Policy Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base">Register LIC Policy Coverage</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-muted-foreground font-semibold">✕</button>
            </div>

            <form onSubmit={handleRegisterPolicy} className="space-y-4 text-xs">
              
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Select Customer</label>
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  required
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.user.fullName} ({c.pan})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Policy Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LIC-998877"
                    value={form.policyNumber}
                    onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">LIC Plan Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jeevan Anand (815)"
                    value={form.planName}
                    onChange={(e) => setForm({ ...form, planName: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Sum Assured (Rs.)</label>
                  <input
                    type="number"
                    required
                    placeholder="1000000"
                    value={form.sumAssured}
                    onChange={(e) => setForm({ ...form, sumAssured: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Premium Amount (Rs.)</label>
                  <input
                    type="number"
                    required
                    placeholder="35000"
                    value={form.premiumAmount}
                    onChange={(e) => setForm({ ...form, premiumAmount: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Premium Mode</label>
                  <select
                    value={form.premiumMode}
                    onChange={(e) => setForm({ ...form, premiumMode: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Field Agent</label>
                  <select
                    value={form.agentId}
                    onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  >
                    <option value="">Direct / Walk-In Sale</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Agent Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary/20"
              >
                {actionLoading ? 'Registering Policy...' : 'Complete Policy Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
