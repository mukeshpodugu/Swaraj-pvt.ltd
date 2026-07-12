import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Banknote,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Calendar,
  FileSpreadsheet,
  PlusCircle,
  Receipt
} from 'lucide-react';
import { LoanStatus, LoanType, PaymentStatus } from '../../../shared/src/types';

export default function Loans() {
  const [loans, setLoans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [emiPayAmount, setEmiPayAmount] = useState('');
  const [partPayAmount, setPartPayAmount] = useState('');
  const [partPayNotes, setPartPayNotes] = useState('');
  
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    loanType: LoanType.PERSONAL,
    principal: '',
    interestRate: '12.0',
    tenorMonths: '12',
    collateral: '',
    guarantorName: '',
    guarantorPhone: '',
    collateralUrl: ''
  });
  
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadLoans();
    loadCustomers();
  }, [statusFilter, typeFilter]);

  async function loadLoans() {
    try {
      setLoading(true);
      const res = await axios.get('/api/loans', {
        params: {
          status: statusFilter || undefined,
          type: typeFilter || undefined
        }
      });
      setLoans(res.data);
    } catch (err) {
      console.error('Failed to load loans', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data.data);
    } catch (err) {
      console.error('Failed to load customers for dropdown', err);
    }
  }

  const selectLoan = async (loan: any) => {
    setSelectedLoan(loan);
    setEmiPayAmount('');
    setPartPayAmount('');
    setPartPayNotes('');
  };

  const handleApprove = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedLoan) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/loans/${selectedLoan.id}/approve`, { status });
      await reloadSelectedLoan();
      alert(`Loan file status updated to: ${status}`);
    } catch (err: any) {
      console.error('Failed to resolve loan approval', err);
      alert(err.response?.data?.error || 'Verification sanction failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyCollateral = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!selectedLoan) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/loans/${selectedLoan.id}/verify-collateral`, { status });
      await reloadSelectedLoan();
      alert(`Collateral has been marked as: ${status}`);
    } catch (err: any) {
      console.error('Failed to verify collateral', err);
      alert(err.response?.data?.error || 'Failed to resolve collateral assessment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburse = async () => {
    if (!selectedLoan) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/loans/${selectedLoan.id}/disburse`);
      await reloadSelectedLoan();
    } catch (err) {
      console.error('Failed to disburse loan funds', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayEmi = async (emiId: string) => {
    if (!selectedLoan || !emiPayAmount) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/loans/${selectedLoan.id}/emi/${emiId}/pay`, {
        amount: emiPayAmount
      });
      await reloadSelectedLoan();
    } catch (err) {
      console.error('EMI payment transaction failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePartPayment = async () => {
    if (!selectedLoan || !partPayAmount) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/loans/${selectedLoan.id}/part-payment`, {
        amount: partPayAmount,
        notes: partPayNotes
      });
      await reloadSelectedLoan();
    } catch (err) {
      console.error('Part payment transaction failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const reloadSelectedLoan = async () => {
    await loadLoans();
    if (selectedLoan) {
      const res = await axios.get('/api/loans');
      const updated = res.data.find((l: any) => l.id === selectedLoan.id);
      setSelectedLoan(updated || null);
    }
    setEmiPayAmount('');
    setPartPayAmount('');
    setPartPayNotes('');
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await axios.post('/api/loans/apply', {
        customerId: form.customerId,
        loanType: form.loanType,
        principal: parseFloat(form.principal),
        interestRate: parseFloat(form.interestRate),
        tenorMonths: parseInt(form.tenorMonths, 10),
        collateralDescription: form.collateral,
        guarantorName: form.guarantorName,
        guarantorPhone: form.guarantorPhone,
        collateralUrl: form.collateralUrl
      });
      setShowApplyModal(false);
      setForm({
        customerId: '',
        loanType: LoanType.PERSONAL,
        principal: '',
        interestRate: '12.0',
        tenorMonths: '12',
        collateral: '',
        guarantorName: '',
        guarantorPhone: '',
        collateralUrl: ''
      });
      await loadLoans();
    } catch (err) {
      console.error('Failed to submit loan application', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 fade-in">
      
      {/* Listing Panel */}
      <div className={`xl:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 ${
        selectedLoan ? 'hidden xl:block' : 'block'
      }`}>
        
        {/* Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Credit & Loans Ledger</h2>
            <p className="text-xs text-muted-foreground">Manage active accounts, track monthly EMIs, and process part-payments.</p>
          </div>
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
          >
            <PlusCircle size={15} />
            <span>Apply For Loan</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search by customer name..."
              className="w-full bg-accent/40 border border-border rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-accent/40 border border-border rounded-xl py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="APPROVED">Approved</option>
            <option value="DISBURSED">Disbursed</option>
            <option value="CLOSED">Settled / Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-accent/40 border border-border rounded-xl py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All Loan Types</option>
            <option value="PERSONAL">Personal Loan</option>
            <option value="HOME">Home Loan</option>
            <option value="GOLD">Gold Loan</option>
            <option value="BUSINESS">Business Capital</option>
            <option value="VEHICLE">Auto / Vehicle</option>
          </select>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <Banknote size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold">No Credit Logs Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] font-semibold text-muted-foreground uppercase">
                  <th className="pb-3">File ID</th>
                  <th className="pb-3">Borrower</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Principal</th>
                  <th className="pb-3 text-right">Outstanding</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-accent/30 transition-colors">
                    <td className="py-3.5 font-semibold text-muted-foreground">
                      {loan.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3.5 font-bold">
                      {loan.customer.user.fullName}
                    </td>
                    <td className="py-3.5 text-muted-foreground">
                      {loan.loanType}
                    </td>
                    <td className="py-3.5 text-right font-semibold">
                      Rs. {loan.principal.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-extrabold text-foreground">
                      Rs. {loan.outstandingBalance.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        loan.status === 'DISBURSED'
                          ? 'bg-green-500/10 text-green-500'
                          : loan.status === 'CLOSED'
                            ? 'bg-blue-500/10 text-blue-500'
                            : loan.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : loan.status === 'REJECTED'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => selectLoan(loan)}
                        className="text-xs bg-accent hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Amortization Details Panel */}
      {selectedLoan && (
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 fade-in">
          
          {/* Panel Header */}
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wide">Credit Schedule Panel</h3>
            <button
              onClick={() => setSelectedLoan(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Close [X]
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bg-accent/30 p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Borrower</span>
              <span className="font-bold">{selectedLoan.customer.user.fullName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Principal Value</span>
              <span className="font-semibold">Rs. {selectedLoan.principal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Outstanding Balance</span>
              <span className="font-extrabold text-primary">Rs. {selectedLoan.outstandingBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Rate & Term</span>
              <span className="font-semibold">{selectedLoan.interestRate}% Interest / {selectedLoan.tenorMonths} Mos</span>
            </div>
            <div className="flex justify-between text-xs border-t border-border/60 pt-1.5 mt-1">
              <span className="text-muted-foreground font-semibold">Collateral Status</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase ${
                selectedLoan.collateralStatus === 'VERIFIED' ? 'bg-green-500/10 text-green-500' :
                selectedLoan.collateralStatus === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                'bg-yellow-500/10 text-yellow-500'
              }`}>{selectedLoan.collateralStatus}</span>
            </div>
            {selectedLoan.collateralDescription && (
              <div className="text-[10px] text-muted-foreground bg-accent/40 p-2.5 rounded-lg space-y-1 mt-2">
                <span className="font-bold text-foreground block">Collateral Description:</span>
                <p className="text-foreground/80 leading-normal">{selectedLoan.collateralDescription}</p>
                {selectedLoan.collateralUrl && (
                  <p className="truncate text-[9px] text-primary mt-1">
                    Doc: <a href={selectedLoan.collateralUrl} target="_blank" rel="noreferrer" className="hover:underline">{selectedLoan.collateralUrl}</a>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Workflow Administration Buttons */}
          {selectedLoan.status === 'APPLIED' && (
            <div className="space-y-4">
              {/* Collateral Review Panel */}
              {selectedLoan.collateralStatus !== 'VERIFIED' ? (
                <div className="border border-yellow-500/20 bg-yellow-500/5 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-yellow-500/90">Collateral Audit Pending</span>
                    <span className="text-[9px] bg-yellow-500/15 text-yellow-500 px-1.5 py-0.5 rounded font-extrabold">{selectedLoan.collateralStatus}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-normal">
                    You must verify the collateral asset details and document authenticity before sanctioning/approving the credit file.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyCollateral('VERIFIED')}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 rounded-lg text-[9px] transition-colors border border-green-700"
                    >
                      Verify & Accept
                    </button>
                    <button
                      onClick={() => handleVerifyCollateral('REJECTED')}
                      disabled={actionLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded-lg text-[9px] transition-colors border border-red-700"
                    >
                      Reject Asset
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 p-2.5 rounded-xl flex items-center justify-between text-[10px] text-green-500 font-bold">
                  <span>✓ Collateral Verified & Approved</span>
                  <span>VERIFIED</span>
                </div>
              )}

              {/* Sanction Decision Row */}
              <div className="flex gap-2 border-t border-border pt-3">
                <button
                  onClick={() => handleApprove('APPROVED')}
                  disabled={actionLoading || selectedLoan.collateralStatus !== 'VERIFIED'}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-xs transition-colors border border-green-700 shadow-md"
                  title={selectedLoan.collateralStatus !== 'VERIFIED' ? 'Verify collateral to enable approval' : 'Sanction Loan File'}
                >
                  Sanction / Approve
                </button>
                <button
                  onClick={() => handleApprove('REJECTED')}
                  disabled={actionLoading}
                  className="flex-1 bg-destructive hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs transition-colors border border-red-700"
                >
                  Reject File
                </button>
              </div>
            </div>
          )}

          {selectedLoan.status === 'APPROVED' && (
            <button
              onClick={handleDisburse}
              disabled={actionLoading}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg text-xs"
            >
              🚀 Disburse Loan Principal
            </button>
          )}

          {/* EMI install list & payments */}
          {selectedLoan.status === 'DISBURSED' && (
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2">Amortization EMIs</h4>
              
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {selectedLoan.emiInstallments.map((emi: any) => (
                  <div key={emi.id} className="border border-border p-3 rounded-lg text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">EMI #{emi.installmentNo}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${
                        emi.status === 'PAID'
                          ? 'bg-green-500/10 text-green-500'
                          : emi.status === 'OVERDUE'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {emi.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Due: {new Date(emi.dueDate).toLocaleDateString()}</span>
                      <span>Principal: Rs. {emi.principalAmount} &bull; Interest: Rs. {emi.interestAmount}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-border">
                      <span className="font-bold text-foreground">Rs. {emi.totalAmount}</span>
                      {emi.status !== 'PAID' && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="Amt"
                            value={emiPayAmount}
                            onChange={(e) => setEmiPayAmount(e.target.value)}
                            className="w-16 bg-accent border border-border rounded px-1.5 py-0.5 text-xs text-right"
                          />
                          <button
                            onClick={() => handlePayEmi(emi.id)}
                            disabled={actionLoading}
                            className="bg-primary hover:bg-blue-600 text-white font-bold px-2 py-1 rounded text-[10px]"
                          >
                            Collect
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Part payment panel */}
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2">Process Part Payment</h4>
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Principal reduction amount..."
                      value={partPayAmount}
                      onChange={(e) => setPartPayAmount(e.target.value)}
                      className="flex-1 bg-accent/40 border border-border rounded-lg py-2 px-3 text-xs"
                    />
                    <button
                      onClick={handlePartPayment}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-2 rounded-lg text-xs"
                    >
                      Reduce Principal
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Notes (e.g. cash deposit details)..."
                    value={partPayNotes}
                    onChange={(e) => setPartPayNotes(e.target.value)}
                    className="w-full bg-accent/40 border border-border rounded-lg py-2 px-3 text-xs"
                  />
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Apply Loan Modal overlay */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base">New Credit File Application</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-muted-foreground font-semibold">✕</button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Select Customer</label>
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  required
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                >
                  <option value="">-- Choose Borrower --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.user.fullName} ({c.pan})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Loan Category</label>
                  <select
                    value={form.loanType}
                    onChange={(e) => setForm({ ...form, loanType: e.target.value as LoanType })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  >
                    <option value={LoanType.PERSONAL}>Personal Loan</option>
                    <option value={LoanType.HOME}>Home Loan</option>
                    <option value={LoanType.GOLD}>Gold Loan</option>
                    <option value={LoanType.BUSINESS}>Business Credit</option>
                    <option value={LoanType.VEHICLE}>Vehicle Loan</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Principal (Rs.)</label>
                  <input
                    type="number"
                    required
                    placeholder="200000"
                    value={form.principal}
                    onChange={(e) => setForm({ ...form, principal: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Tenor (Months)</label>
                  <input
                    type="number"
                    required
                    value={form.tenorMonths}
                    onChange={(e) => setForm({ ...form, tenorMonths: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Collateral Assets Description</label>
                <input
                  type="text"
                  placeholder="Property papers / Gold items carat and weight / Fixed Deposit No"
                  value={form.collateral}
                  onChange={(e) => setForm({ ...form, collateral: e.target.value })}
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Collateral Document Drive URL / Link</label>
                <input
                  type="text"
                  placeholder="e.g. https://drive.google.com/file/d/document"
                  value={form.collateralUrl}
                  onChange={(e) => setForm({ ...form, collateralUrl: e.target.value })}
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Guarantor Name</label>
                  <input
                    type="text"
                    placeholder="Sanjay Khanna"
                    value={form.guarantorName}
                    onChange={(e) => setForm({ ...form, guarantorName: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Guarantor Phone</label>
                  <input
                    type="text"
                    placeholder="9988998899"
                    value={form.guarantorPhone}
                    onChange={(e) => setForm({ ...form, guarantorPhone: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary/20"
              >
                {actionLoading ? 'Submitting Application...' : 'Apply & Register File'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
