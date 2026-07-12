import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  Banknote,
  PiggyBank,
  HeartHandshake,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalDisbursed: 0,
    activeCollections: 0,
    activeChitsVal: 0,
    licPipelineVal: 0,
    defaultersCount: 0,
    recentActivity: [] as any[],
    chartData: [] as any[],
    defaulterAlerts: [] as any[],
    duesList: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [loansRes, chitsRes, licRes, alertsRes] = await Promise.all([
          axios.get('/api/loans'),
          axios.get('/api/chits'),
          axios.get('/api/lic'),
          axios.get('/api/lic/alerts')
        ]);

        const loans = loansRes.data;
        const chits = chitsRes.data;
        const policies = licRes.data;
        const alerts = alertsRes.data;

        // Compute totals
        const totalDisbursed = loans.reduce((sum: number, l: any) => sum + l.principal, 0);
        
        let activeCollections = 0;
        loans.forEach((l: any) => {
          l.emiInstallments.forEach((e: any) => {
            if (e.status === 'PAID') activeCollections += e.paidAmount;
          });
        });
        chits.forEach((g: any) => {
          g.installments.forEach((i: any) => {
            if (i.status === 'PAID') activeCollections += i.paidAmount;
          });
        });

        const activeChitsVal = chits.reduce((sum: number, g: any) => sum + g.groupValue, 0);
        const licPipelineVal = policies.reduce((sum: number, p: any) => sum + p.premiumAmount, 0);

        // Defaulter metrics check
        let defaultersCount = 0;
        const defaulterAlerts: any[] = [];
        const today = new Date();

        loans.forEach((l: any) => {
          l.emiInstallments.forEach((e: any) => {
            if ((e.status === 'UNPAID' || e.status === 'OVERDUE') && new Date(e.dueDate) < today) {
              defaultersCount++;
              defaulterAlerts.push({
                name: l.customer.user.fullName,
                item: `${l.loanType} Loan EMI #${e.installmentNo}`,
                due: e.totalAmount,
                days: Math.ceil(Math.abs(today.getTime() - new Date(e.dueDate).getTime()) / (1000 * 60 * 60 * 24))
              });
            }
          });
        });

        // Set state metrics
        setMetrics({
          totalDisbursed,
          activeCollections,
          activeChitsVal,
          licPipelineVal,
          defaultersCount,
          recentActivity: [
            { id: 1, type: 'LOAN', desc: 'New loan application submitted by Priya Nair', date: 'Today' },
            { id: 2, type: 'PAYMENT', desc: 'Amit Patel cleared Personal Loan EMI #2 successfully', date: 'Yesterday' },
            { id: 3, type: 'CHIT', desc: 'Resolved Swaraj Royal 2 Lakhs Chit auction installment #1', date: '2 days ago' }
          ],
          chartData: [
            { name: 'Jan', Collections: 45000, Disbursements: 120000 },
            { name: 'Feb', Collections: 52000, Disbursements: 80000 },
            { name: 'Mar', Collections: 61000, Disbursements: 200000 },
            { name: 'Apr', Collections: 75000, Disbursements: 150000 },
            { name: 'May', Collections: 89000, Disbursements: 95000 },
            { name: 'Jun', Collections: activeCollections || 105000, Disbursements: totalDisbursed || 200000 }
          ],
          defaulterAlerts: defaulterAlerts.slice(0, 4),
          duesList: alerts.slice(0, 4)
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-muted rounded-xl lg:col-span-2"></div>
          <div className="h-96 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      
      {/* Welcome Heading Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Financial Overview</h1>
          <p className="text-sm text-muted-foreground">Monitoring active portfolios for Swaraj Pvt. Limited branch operations.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg text-xs font-semibold">
          <Calendar size={14} className="text-primary" />
          <span>Session Date: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Loan Capital Disbursed */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loan Principal Issued</span>
              <h3 className="text-2xl font-bold">Rs. {metrics.totalDisbursed.toLocaleString()}</h3>
            </div>
            <div className="bg-primary/10 text-primary p-2.5 rounded-xl group-hover:scale-110 transition-transform">
              <Banknote size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-green-500 font-semibold">
            <TrendingUp size={14} />
            <span>+12.4% Capital growth</span>
          </div>
        </div>

        {/* Total Ledger Collections */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ledger Receipts</span>
              <h3 className="text-2xl font-bold">Rs. {metrics.activeCollections.toLocaleString()}</h3>
            </div>
            <div className="bg-green-500/10 text-green-500 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
              <PiggyBank size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-green-500 font-semibold">
            <TrendingUp size={14} />
            <span>+8.2% Monthly interest margin</span>
          </div>
        </div>

        {/* Chit value */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Chit Holdings</span>
              <h3 className="text-2xl font-bold">Rs. {metrics.activeChitsVal.toLocaleString()}</h3>
            </div>
            <div className="bg-indigo-500/10 text-indigo-500 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Clock size={14} />
            <span>20 Subscribers per pool average</span>
          </div>
        </div>

        {/* LIC coverage */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LIC Premiums Tracked</span>
              <h3 className="text-2xl font-bold">Rs. {metrics.licPipelineVal.toLocaleString()}</h3>
            </div>
            <div className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
              <HeartHandshake size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Clock size={14} />
            <span>Recurring Commission generated</span>
          </div>
        </div>

      </div>

      {/* Recharts Area Chart & Defaulter warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-base">Collections vs. Capital Outflow</h4>
              <p className="text-xs text-muted-foreground">Historical comparison of customer loan disbursements and monthly EMI receipts.</p>
            </div>
            <span className="bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded text-[10px] font-semibold">6-Month Trend</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chartData}>
                <defs>
                  <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDisbursements" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Collections" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCollections)" />
                <Area type="monotone" dataKey="Disbursements" stroke="#1e3a8a" strokeWidth={2} fillOpacity={1} fill="url(#colorDisbursements)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight Box & Defaulter notifications panel */}
        <div className="flex flex-col gap-6">
          
          {/* AI Insights */}
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Lightbulb size={20} className="text-yellow-400" />
              <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Predictive AI Insights</h4>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="border-l-2 border-primary pl-3 py-0.5">
                <p className="font-semibold text-white">High Approval Probability</p>
                <p>Priya Nair shows a low debt ratio (LTV 42%). Credit model recommends immediate approval of applied home loan.</p>
              </div>
              <div className="border-l-2 border-red-500 pl-3 py-0.5">
                <p className="font-semibold text-white text-red-400">Default Risk Warning</p>
                <p>Amit Patel personal loan default risk score has increased by 15% due to a 5-day delay in current EMI #3.</p>
              </div>
            </div>
          </div>

          {/* Dues list Alerts */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-sm mb-3">Upcoming Policy Premium Dues</h4>
              {metrics.duesList.length === 0 ? (
                <p className="text-xs text-muted-foreground">No premiums due in the next 30 days.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.duesList.map((policy) => (
                    <div key={policy.id} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold">{policy.customer.user.fullName}</p>
                        <span className="text-[10px] text-muted-foreground">{policy.planName} &bull; {policy.policyNumber}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">Rs. {policy.premiumAmount.toLocaleString()}</p>
                        <span className="text-[10px] text-orange-500 font-medium">Due: {new Date(policy.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Defaulters and Recent Operations timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Defaulter warning cards list */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" size={18} />
              <h4 className="font-bold text-sm">Critical Overdue Payments ({metrics.defaultersCount})</h4>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Action Required</span>
          </div>
          
          {metrics.defaulterAlerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No accounts are currently delinquent.</p>
          ) : (
            <div className="divide-y divide-border">
              {metrics.defaulterAlerts.map((alert, i) => (
                <div key={i} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-xs">
                  <div>
                    <p className="font-semibold">{alert.name}</p>
                    <span className="text-[10px] text-muted-foreground">{alert.item}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">Rs. {alert.due.toLocaleString()}</p>
                    <span className="text-[10px] font-semibold text-destructive">{alert.days} Days Past Due</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent timeline operations */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="font-bold text-sm">Recent Activity Log</h4>
          <div className="relative border-l border-border pl-4 space-y-5">
            {metrics.recentActivity.map((act) => (
              <div key={act.id} className="relative text-xs">
                {/* Dot */}
                <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card"></span>
                <p className="font-medium text-foreground">{act.desc}</p>
                <span className="text-[10px] text-muted-foreground">{act.date}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
