import React, { useState } from 'react';
import axios from 'axios';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Users,
  Banknote,
  PiggyBank,
  HeartHandshake,
  TrendingUp,
  AlertTriangle,
  Printer
} from 'lucide-react';

export default function Reports() {
  const [kycFilter, setKycFilter] = useState('');
  const [loanStatus, setLoanStatus] = useState('');
  const [loanType, setLoanType] = useState('');
  const [chitStatus, setChitStatus] = useState('');
  const [licStatus, setLicStatus] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [sendingReminders, setSendingReminders] = useState(false);

  const handleSendReminders = async () => {
    try {
      setSendingReminders(true);
      const res = await axios.post('/api/reports/send-reminders');
      alert(`Overdue scan complete! Dispatch successful. Sent ${res.data.count} due reminders (email and WhatsApp logs registered).`);
    } catch (err) {
      console.error('Failed to send reminders', err);
      alert('Error scanning and sending due reminders.');
    } finally {
      setSendingReminders(false);
    }
  };

  // Downloads helper
  const triggerDownload = async (reportPath: string, extraParams: Record<string, string> = {}) => {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...extraParams
      });
      // Fetch report as a Blob via authenticated Axios
      const response = await axios.get(`/api/reports/${reportPath}?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const format = extraParams.format || 'pdf';
      let ext = 'csv';
      if (format === 'excel') ext = 'xlsx';
      else if (format === 'pdf') ext = 'pdf';

      const contentType = response.headers['content-type'] as string | undefined;
      const blob = new Blob([response.data], { type: contentType || undefined });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportPath}_report_${new Date().toISOString().split('T')[0]}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Download Report Error]', err);
      alert('Failed to compile and download report. Check query parameters.');
    }
  };

  const reportsList = [
    {
      id: 'customers',
      title: 'Customer Directory & KYC Audit',
      description: 'Directory list of registered subscribers, Aadhaar/PAN, monthly income, and KYC statuses.',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
      path: 'customers',
      filters: (
        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-1">Filter KYC Status</label>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="w-full bg-accent border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
          >
            <option value="">All KYC Status</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      ),
      getParams: () => ({ kycStatus: kycFilter })
    },
    {
      id: 'loans',
      title: 'Credit Lending & EMIs Portfolio',
      description: 'Lending summary including principal values, outstanding balances, terms, and statuses.',
      icon: Banknote,
      color: 'bg-green-500/10 text-green-500',
      path: 'loans',
      filters: (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">Status</label>
            <select
              value={loanStatus}
              onChange={(e) => setLoanStatus(e.target.value)}
              className="w-full bg-accent border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="APPLIED">Applied</option>
              <option value="APPROVED">Approved</option>
              <option value="DISBURSED">Disbursed</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">Type</label>
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              className="w-full bg-accent border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
            >
              <option value="">All Types</option>
              <option value="PERSONAL">Personal</option>
              <option value="HOME">Home</option>
              <option value="GOLD">Gold</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>
        </div>
      ),
      getParams: () => ({ status: loanStatus, type: loanType })
    },
    {
      id: 'chits',
      title: 'Chit Mutual Funds Matrix',
      description: 'Active savings group holdings, member counts, durations, and auctions completed.',
      icon: PiggyBank,
      color: 'bg-indigo-500/10 text-indigo-500',
      path: 'chits',
      filters: (
        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-1">Group Status</label>
          <select
            value={chitStatus}
            onChange={(e) => setChitStatus(e.target.value)}
            className="w-full bg-accent border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
          >
            <option value="">All Groups</option>
            <option value="ACTIVE">Active Pools</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      ),
      getParams: () => ({ status: chitStatus })
    },
    {
      id: 'lic',
      title: 'LIC Insurance Policies Portfolio',
      description: 'Insurance summary of registered plans, agent commissions, sum assured, and premiums.',
      icon: HeartHandshake,
      color: 'bg-emerald-500/10 text-emerald-500',
      path: 'lic',
      filters: (
        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-1">Policy Status</label>
          <select
            value={licStatus}
            onChange={(e) => setLicStatus(e.target.value)}
            className="w-full bg-accent border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
          >
            <option value="">All Policies</option>
            <option value="ACTIVE">Active</option>
            <option value="LAPSED">Lapsed</option>
          </select>
        </div>
      ),
      getParams: () => ({ status: licStatus })
    },
    {
      id: 'defaulters',
      title: 'Delinquency & Overdue Defaulters',
      description: 'Critical collections checklist detailing clients with pending EMI or Chit payments past due.',
      icon: AlertTriangle,
      color: 'bg-red-500/10 text-red-500',
      path: 'defaulters',
      filters: <p className="text-[10px] text-muted-foreground leading-normal mt-2">Outputs list sorted by days past due. Filters not required.</p>,
      getParams: () => ({})
    },
    {
      id: 'cashflow',
      title: 'Fiscal Ledger Income & Expense',
      description: 'Consolidated ledger statement tracking interest margins, commission revenues, and loan capital outflow.',
      icon: TrendingUp,
      color: 'bg-purple-500/10 text-purple-500',
      path: 'cash-flow',
      filters: <p className="text-[10px] text-muted-foreground leading-normal mt-2">Calculates net ledger balance sheets. Filters not required.</p>,
      getParams: () => ({})
    },
    {
      id: 'monthlystatus',
      title: 'Monthly Subscriptions & Collections Audit',
      description: 'Unified payment audit details showing Loan, Chit, and LIC users who paid or have unpaid dues.',
      icon: FileSpreadsheet,
      color: 'bg-amber-500/10 text-amber-500',
      path: 'monthly-status',
      filters: <p className="text-[10px] text-muted-foreground leading-normal mt-2">Consolidates collections status. Driven by Global Date Filter.</p>,
      getParams: () => ({})
    }
  ];

  return (
    <div className="space-y-6 fade-in text-xs sm:text-sm">
      
      {/* Title & Header Actions */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Report Export Center</h1>
          <p className="text-xs text-muted-foreground font-medium">Download audit-compliant spreadsheets, structured PDFs, or CSV data files with Swaraj Pvt. Limited branding.</p>
        </div>
        <button
          onClick={handleSendReminders}
          disabled={sendingReminders}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center gap-2 border border-red-700 shadow-md shadow-red-950/20"
        >
          <AlertTriangle size={14} className="animate-pulse" />
          <span>{sendingReminders ? 'Dispatching...' : 'Dispatch Due Reminders'}</span>
        </button>
      </div>

      {/* Date Range Selector Global */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2">Global Date Filter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-accent border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-accent border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportsList.map((report) => (
          <div key={report.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-colors space-y-4">
            
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className={`${report.color} p-2.5 rounded-xl`}>
                  <report.icon size={20} />
                </div>
                <button
                  onClick={() => triggerDownload(report.path, { format: 'pdf', ...report.getParams() })}
                  className="p-2 bg-accent/40 text-muted-foreground hover:bg-primary hover:text-white rounded-lg transition-colors"
                  title="Print PDF direct download"
                >
                  <Printer size={14} />
                </button>
              </div>

              <div>
                <h3 className="font-bold text-sm text-foreground">{report.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">{report.description}</p>
              </div>
            </div>

            {/* Custom filters panel inside card */}
            <div className="border-t border-border/60 pt-3">
              {report.filters}
            </div>

            {/* Download Buttons actions */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                onClick={() => triggerDownload(report.path, { format: 'excel', ...report.getParams() })}
                className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-primary hover:text-white py-2 rounded-lg text-[10px] font-bold transition-all text-muted-foreground"
              >
                <FileSpreadsheet size={12} />
                <span>EXCEL</span>
              </button>
              <button
                onClick={() => triggerDownload(report.path, { format: 'csv', ...report.getParams() })}
                className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-primary hover:text-white py-2 rounded-lg text-[10px] font-bold transition-all text-muted-foreground"
              >
                <Download size={12} />
                <span>CSV</span>
              </button>
              <button
                onClick={() => triggerDownload(report.path, { format: 'pdf', ...report.getParams() })}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold transition-all"
              >
                <FileText size={12} />
                <span>PDF</span>
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
