import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BrainCircuit,
  UserCheck,
  ShieldAlert,
  Sliders,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  BarChart2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function AIPredictions() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Prediction tabs
  const [activeTab, setActiveTab] = useState<'approval' | 'default'>('approval');

  // Approval Form & Result
  const [approvalForm, setApprovalForm] = useState({
    customerId: '',
    requestedPrincipal: '',
    tenorMonths: '12',
    interestRate: '12.0',
    otherEMIs: '0',
    hasCollateral: false
  });
  const [approvalResult, setApprovalResult] = useState<any | null>(null);

  // Default Form & Result
  const [defaultForm, setDefaultForm] = useState({
    loanId: ''
  });
  const [defaultResult, setDefaultResult] = useState<any | null>(null);

  const [predictLoading, setPredictLoading] = useState(false);

  useEffect(() => {
    loadDropdowns();
    loadHistory();
  }, []);

  async function loadDropdowns() {
    try {
      setLoading(true);
      const [custRes, loansRes] = await Promise.all([
        axios.get('/api/customers'),
        axios.get('/api/loans')
      ]);
      setCustomers(custRes.data.data);
      // Filter loans that are active / disbursed for default risk check
      setLoans(loansRes.data.filter((l: any) => l.status === 'DISBURSED'));
    } catch (err) {
      console.error('Failed to load dropdown datasets', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await axios.get('/api/ai/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load predictions history', err);
    }
  }

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApprovalResult(null);
    setPredictLoading(true);
    try {
      const res = await axios.post('/api/ai/predict-approval', approvalForm);
      setApprovalResult(res.data);
      await loadHistory();
    } catch (err) {
      console.error('AI underwriter request failed', err);
    } finally {
      setPredictLoading(false);
    }
  };

  const handleDefaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDefaultResult(null);
    setPredictLoading(true);
    try {
      const res = await axios.post('/api/ai/predict-default', defaultForm);
      setDefaultResult(res.data);
      await loadHistory();
    } catch (err) {
      console.error('AI default assessor failed', err);
    } finally {
      setPredictLoading(false);
    }
  };

  // Convert Feature Importance record into Recharts compatible list
  const formatFeatureData = (featRecord: Record<string, number>) => {
    if (!featRecord) return [];
    return Object.entries(featRecord).map(([key, val]) => ({
      name: key,
      Weight: val
    }));
  };

  return (
    <div className="space-y-6 fade-in text-xs sm:text-sm">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">AI Predictive Credit Center</h1>
        <p className="text-xs text-muted-foreground font-medium">Underwrite loan approvals, run default calculators, and inspect confidence variables weight metrics.</p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('approval')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-colors ${
            activeTab === 'approval' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck size={16} />
          <span>Loan Underwriting Predictor</span>
        </button>
        <button
          onClick={() => setActiveTab('default')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-colors ${
            activeTab === 'default' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert size={16} />
          <span>Lending Default Assessment</span>
        </button>
      </div>

      {/* Primary Forms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Panel */}
        <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          {activeTab === 'approval' ? (
            // Approval Underwriter Form
            <form onSubmit={handleApprovalSubmit} className="space-y-4 text-xs">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2 mb-4">Underwriting Input Parameters</h3>
              
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Select Customer Profile</label>
                <select
                  value={approvalForm.customerId}
                  onChange={(e) => setApprovalForm({ ...approvalForm, customerId: e.target.value })}
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
                  <label className="font-bold text-muted-foreground block mb-1">Requested Principal (Rs.)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100000"
                    value={approvalForm.requestedPrincipal}
                    onChange={(e) => setApprovalForm({ ...approvalForm, requestedPrincipal: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Term (Months)</label>
                  <input
                    type="number"
                    required
                    value={approvalForm.tenorMonths}
                    onChange={(e) => setApprovalForm({ ...approvalForm, tenorMonths: e.target.value })}
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
                    value={approvalForm.interestRate}
                    onChange={(e) => setApprovalForm({ ...approvalForm, interestRate: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Other Active EMIs (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={approvalForm.otherEMIs}
                    onChange={(e) => setApprovalForm({ ...approvalForm, otherEMIs: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5">
                <input
                  type="checkbox"
                  id="collateralCheck"
                  checked={approvalForm.hasCollateral}
                  onChange={(e) => setApprovalForm({ ...approvalForm, hasCollateral: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="collateralCheck" className="font-bold text-muted-foreground cursor-pointer select-none">
                  Borrower provides secure asset collateral backing
                </label>
              </div>

              <button
                type="submit"
                disabled={predictLoading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <BrainCircuit size={16} />
                <span>{predictLoading ? 'Calculating underwriting matrix...' : 'Execute Predictive AI Underwriter'}</span>
              </button>
            </form>
          ) : (
            // Default Risk Form
            <form onSubmit={handleDefaultSubmit} className="space-y-4 text-xs">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2 mb-4">Risk Input Parameters</h3>
              
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Select Disbursed Loan File</label>
                <select
                  value={defaultForm.loanId}
                  onChange={(e) => setDefaultForm({ ...defaultForm, loanId: e.target.value })}
                  required
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                >
                  <option value="">-- Select Active Loan File --</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>{l.customer.user.fullName} &bull; {l.loanType} ({l.id.substring(0, 8).toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={predictLoading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <BrainCircuit size={16} />
                <span>{predictLoading ? 'Running Risk Assessor...' : 'Evaluate Delinquency Default Risk'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between min-h-[400px]">
          
          {/* Default Welcome / Placeholder state */}
          {!approvalResult && !defaultResult && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground space-y-3">
              <BrainCircuit size={48} className="text-primary/40 animate-pulse" />
              <p className="text-sm font-semibold">Ready to Evaluate borrower risk</p>
              <p className="text-xs max-w-sm">Provide details in the left settings panel and click Execute to view underwriting predictions.</p>
            </div>
          )}

          {/* Underwriter Result Output */}
          {activeTab === 'approval' && approvalResult && (
            <div className="space-y-6 fade-in text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Score Dial */}
                <div className="border border-border p-4 rounded-xl text-center space-y-1 bg-accent/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Approval Score</span>
                  <h4 className={`text-4xl font-extrabold ${
                    approvalResult.approvalScore >= 75
                      ? 'text-green-500'
                      : approvalResult.approvalScore >= 50
                        ? 'text-orange-500'
                        : 'text-destructive'
                  }`}>
                    {approvalResult.approvalScore}%
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Confidence: {approvalResult.confidenceScore}%</span>
                </div>

                {/* Rating Card */}
                <div className="border border-border p-4 rounded-xl text-center space-y-1 bg-accent/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Recommendation</span>
                  <h4 className={`text-xl font-extrabold mt-1.5 uppercase ${
                    approvalResult.decision === 'APPROVED' ? 'text-green-500' : approvalResult.decision === 'REJECTED' ? 'text-destructive' : 'text-orange-500'
                  }`}>
                    {approvalResult.decision}
                  </h4>
                </div>

                {/* Credit Score */}
                <div className="border border-border p-4 rounded-xl text-center space-y-1 bg-accent/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Calculated Credit</span>
                  <h4 className="text-3xl font-extrabold text-foreground">{approvalResult.customerCreditScore}</h4>
                  <span className="text-[10px] text-muted-foreground">Rating: {approvalResult.customerCreditRating}</span>
                </div>

              </div>

              {/* Chart & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Feature weights chart */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2 flex items-center gap-1">
                    <BarChart2 size={12} />
                    <span>Feature Importance Weights</span>
                  </h4>
                  <div className="h-44 border border-border rounded-xl p-2 bg-accent/5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatFeatureData(approvalResult.featureImportance)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="Weight" fill="#1e3a8a">
                          {formatFeatureData(approvalResult.featureImportance).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.Weight >= 0 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recommendations list */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2 flex items-center gap-1">
                    <Award size={12} />
                    <span>System Recommendations</span>
                  </h4>
                  <div className="bg-accent/10 border border-border p-4 rounded-xl space-y-2.5">
                    {approvalResult.recommendations.map((rec: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground leading-normal flex items-start gap-2">
                        <span className="text-primary mt-0.5">&bull;</span>
                        <span>{rec}</span>
                      </p>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Default Result Output */}
          {activeTab === 'default' && defaultResult && (
            <div className="space-y-6 fade-in text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Score Card */}
                <div className="border border-border p-4 rounded-xl text-center space-y-1 bg-accent/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Default Likelihood</span>
                  <h4 className={`text-4xl font-extrabold ${
                    defaultResult.defaultRisk >= 50
                      ? 'text-destructive'
                      : defaultResult.defaultRisk >= 25
                        ? 'text-orange-500'
                        : 'text-green-500'
                  }`}>
                    {defaultResult.defaultRisk}%
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Confidence: {defaultResult.confidenceScore}%</span>
                </div>

                {/* Risk Level Card */}
                <div className="border border-border p-4 rounded-xl text-center space-y-1 bg-accent/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Risk Bucket Classification</span>
                  <h4 className={`text-2xl font-extrabold mt-1 uppercase ${
                    defaultResult.riskLevel === 'HIGH' ? 'text-destructive' : defaultResult.riskLevel === 'MEDIUM' ? 'text-orange-500' : 'text-green-500'
                  }`}>
                    {defaultResult.riskLevel} Risk
                  </h4>
                </div>

              </div>

              {/* Chart & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Feature weights chart */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2 flex items-center gap-1">
                    <BarChart2 size={12} />
                    <span>Risk Driver Weights</span>
                  </h4>
                  <div className="h-44 border border-border rounded-xl p-2 bg-accent/5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatFeatureData(defaultResult.featureImportance)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={100} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="Weight" fill="#ef4444">
                          {formatFeatureData(defaultResult.featureImportance).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.Weight >= 15 ? '#ef4444' : '#f59e0b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recommendations list */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2 flex items-center gap-1">
                    <Award size={12} />
                    <span>Risk Mitigation Pipeline</span>
                  </h4>
                  <div className="bg-accent/10 border border-border p-4 rounded-xl space-y-2.5">
                    {defaultResult.recommendations.map((rec: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground leading-normal flex items-start gap-2">
                        <span className="text-destructive mt-0.5">&bull;</span>
                        <span>{rec}</span>
                      </p>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* History table */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="text-primary" size={18} />
          <h4 className="font-bold text-sm">Historical AI Underwriting Runs Logs</h4>
        </div>
        
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No historical evaluations recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-semibold text-muted-foreground uppercase">
                  <th className="pb-2">Evaluation Date</th>
                  <th className="pb-2">Subscriber</th>
                  <th className="pb-2">Scoring Type</th>
                  <th className="pb-2 text-right">Probability Score</th>
                  <th className="pb-2 text-right">Confidence Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {history.slice(0, 6).map((log) => (
                  <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-bold">
                      {log.customer.user.fullName}
                    </td>
                    <td className="py-2.5 text-muted-foreground font-semibold">
                      {log.predictionType}
                    </td>
                    <td className="py-2.5 text-right font-extrabold">
                      {log.predictionScore}%
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {log.confidenceScore}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
