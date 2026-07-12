import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  UserCheck,
  TrendingUp,
  History,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [selectedCust, setSelectedCust] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [kycNotes, setKycNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [search, kycFilter]);

  async function loadCustomers() {
    try {
      setLoading(true);
      const res = await axios.get('/api/customers', {
        params: {
          search,
          kycStatus: kycFilter || undefined
        }
      });
      setCustomers(res.data.data);
    } catch (err) {
      console.error('Failed to load customers list', err);
    } finally {
      setLoading(false);
    }
  }

  // Load timeline when user selects a customer
  const selectCustomer = async (cust: any) => {
    setSelectedCust(cust);
    setTimeline([]);
    setKycNotes('');
    try {
      setLoadingTimeline(true);
      const res = await axios.get(`/api/customers/${cust.id}/timeline`);
      setTimeline(res.data);
    } catch (err) {
      console.error('Failed to load customer timeline', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleVerifyKYC = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!selectedCust) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/customers/${selectedCust.id}/verify-kyc`, {
        status,
        notes: kycNotes
      });
      
      // Reload lists
      await loadCustomers();
      // Re-fetch selected customer details
      const detailRes = await axios.get(`/api/customers/${selectedCust.id}`);
      setSelectedCust(detailRes.data);
      // Reload timeline
      const timelineRes = await axios.get(`/api/customers/${selectedCust.id}/timeline`);
      setTimeline(timelineRes.data);
    } catch (err) {
      console.error('Failed to update KYC status', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 fade-in">
      
      {/* List Panel */}
      <div className={`xl:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 ${
        selectedCust ? 'hidden xl:block' : 'block'
      }`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Customer CRM Registry</h2>
            <p className="text-xs text-muted-foreground">Search profiles, trace documentation verification, and check KYC status.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search by Name, Email, Phone, Aadhaar, PAN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-accent/40 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3.5 text-muted-foreground" size={14} />
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="bg-accent/40 border border-border rounded-xl py-2.5 pl-9 pr-8 text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer"
            >
              <option value="">All KYC Status</option>
              <option value="PENDING">Pending Verification</option>
              <option value="VERIFIED">Verified Profiles</option>
              <option value="REJECTED">Rejected / Delinquent Docs</option>
            </select>
          </div>
        </div>

        {/* Table List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <UserCheck size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold">No Customers Found</p>
            <p className="text-xs">Adjust search parameters or check filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                  <th className="pb-3">Subscriber</th>
                  <th className="pb-3">Identity Docs</th>
                  <th className="pb-3 text-right">Monthly Income</th>
                  <th className="pb-3 text-center">KYC Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-accent/30 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        {cust.photoUrl ? (
                          <img src={cust.photoUrl} alt={cust.user.fullName} className="w-9 h-9 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-9 h-9 bg-primary/10 text-primary flex items-center justify-center font-bold rounded-full">
                            {cust.user.fullName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-foreground">{cust.user.fullName}</p>
                          <span className="text-[10px] text-muted-foreground">{cust.user.email} &bull; {cust.user.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="font-semibold text-muted-foreground">PAN: <code className="text-foreground">{cust.pan}</code></p>
                      <span className="text-[10px] text-muted-foreground">Aadhaar: <code>{cust.aadhaar}</code></span>
                    </td>
                    <td className="py-4 text-right font-bold">
                      Rs. {cust.monthlyIncome.toLocaleString()}
                    </td>
                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        cust.kycStatus === 'VERIFIED'
                          ? 'bg-green-500/10 text-green-500'
                          : cust.kycStatus === 'REJECTED'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {cust.kycStatus === 'VERIFIED' ? <CheckCircle size={10} /> : cust.kycStatus === 'REJECTED' ? <XCircle size={10} /> : <Clock size={10} />}
                        {cust.kycStatus}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => selectCustomer(cust)}
                        className="bg-accent hover:bg-primary hover:text-white p-2 rounded-lg text-muted-foreground transition-all duration-150"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Details Slide-Panel */}
      {selectedCust && (
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 fade-in">
          
          {/* Header Close button */}
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="font-extrabold text-base">Subscriber Dossier</h3>
            <button
              onClick={() => setSelectedCust(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Close Panel [X]
            </button>
          </div>

          {/* Profile Card Banner */}
          <div className="flex items-center gap-4 bg-accent/30 p-4 rounded-xl">
            {selectedCust.photoUrl ? (
              <img src={selectedCust.photoUrl} alt={selectedCust.user.fullName} className="w-12 h-12 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center font-bold rounded-full text-base">
                {selectedCust.user.fullName.charAt(0)}
              </div>
            )}
            <div>
              <h4 className="font-bold text-sm text-foreground">{selectedCust.user.fullName}</h4>
              <p className="text-[10px] text-muted-foreground">{selectedCust.user.email}</p>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">Role: Customer</span>
            </div>
          </div>

          {/* Information Categories */}
          <div className="space-y-4 text-xs">
            
            {/* Identity details */}
            <div className="space-y-2.5">
              <h5 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">Identity Details</h5>
              <div className="grid grid-cols-2 gap-4 bg-accent/20 p-3 rounded-lg">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Aadhaar Card</span>
                  <code className="font-semibold">{selectedCust.aadhaar}</code>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">PAN Card</span>
                  <code className="font-semibold">{selectedCust.pan}</code>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-muted-foreground block">Permanent Address</span>
                  <p className="font-semibold text-foreground leading-normal">{selectedCust.address}</p>
                </div>
              </div>
            </div>

            {/* Income details */}
            <div className="space-y-2.5">
              <h5 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">Employment & Income</h5>
              <div className="grid grid-cols-2 gap-4 bg-accent/20 p-3 rounded-lg">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Employment</span>
                  <p className="font-semibold uppercase">{selectedCust.employmentStatus}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Employer Name</span>
                  <p className="font-semibold">{selectedCust.employerName || 'Self Employed / Retd'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-muted-foreground block">Monthly Net Income</span>
                  <p className="font-extrabold text-foreground text-sm">Rs. {selectedCust.monthlyIncome.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Nominee details */}
            <div className="space-y-2.5">
              <h5 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">Nominee Assignment</h5>
              <div className="bg-accent/20 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">Nominee Name</span>
                  <span className="font-semibold">{selectedCust.nomineeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">Relation</span>
                  <span className="font-semibold uppercase">{selectedCust.nomineeRelation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">Contact Phone</span>
                  <span className="font-semibold"><code>{selectedCust.nomineePhone}</code></span>
                </div>
              </div>
            </div>

            {/* Compliance Action Section */}
            {selectedCust.kycStatus === 'PENDING' && (
              <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl space-y-3">
                <div className="flex gap-2 text-orange-500">
                  <AlertCircle size={16} />
                  <span className="font-bold text-[11px] uppercase tracking-wider">KYC Verification Pending</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Verify Aadhaar & PAN details match before checking VERIFIED status.
                </p>
                <textarea
                  placeholder="Verification Notes (Optional rejection reasons)..."
                  value={kycNotes}
                  onChange={(e) => setKycNotes(e.target.value)}
                  className="w-full bg-accent/40 border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500 h-16 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerifyKYC('VERIFIED')}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-xs disabled:opacity-50"
                  >
                    Approve KYC
                  </button>
                  <button
                    onClick={() => handleVerifyKYC('REJECTED')}
                    disabled={actionLoading}
                    className="flex-1 bg-destructive hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs disabled:opacity-50"
                  >
                    Reject KYC
                  </button>
                </div>
              </div>
            )}

            {/* Timeline Events Log */}
            <div className="space-y-3">
              <h5 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2 flex items-center gap-2">
                <History size={12} />
                <span>Account Activity Log</span>
              </h5>
              
              {loadingTimeline ? (
                <div className="h-20 bg-muted animate-pulse rounded-lg"></div>
              ) : timeline.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">No chronological history recorded.</p>
              ) : (
                <div className="relative border-l border-border pl-3 space-y-4 max-h-64 overflow-y-auto pr-1">
                  {timeline.map((event, index) => (
                    <div key={index} className="relative text-[10px]">
                      <span className="absolute -left-[17px] top-0.5 w-2 h-2 rounded-full bg-primary/70 border border-card"></span>
                      <p className="font-semibold text-foreground leading-normal">{event.title}</p>
                      <p className="text-[9px] text-muted-foreground leading-normal">{event.description}</p>
                      <span className="text-[8px] text-muted-foreground/60">{new Date(event.date).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
