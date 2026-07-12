import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PiggyBank,
  PlusCircle,
  Users,
  Calendar,
  Hammer,
  DollarSign,
  UserPlus,
  ArrowRightCircle,
  Receipt,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function ChitFunds() {
  const [groups, setGroups] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  // Modals / Overlays
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    groupValue: '',
    durationMonths: '20',
    maxMembers: '20',
    commissionRate: '5.0',
    startDate: ''
  });

  const [joinForm, setJoinForm] = useState({
    customerId: '',
    slotNumber: ''
  });

  const [auctionForm, setAuctionForm] = useState({
    installmentNo: '',
    winningBidderId: '',
    bidAmount: ''
  });

  const [installmentPayAmount, setInstallmentPayAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadChits();
    loadCustomers();
  }, []);

  async function loadChits() {
    try {
      setLoading(true);
      const res = await axios.get('/api/chits');
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to load chits', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data.data);
    } catch (err) {
      console.error('Failed to load customers list', err);
    }
  }

  const selectGroup = (group: any) => {
    setSelectedGroup(group);
    setInstallmentPayAmount('');
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await axios.post('/api/chits', createForm);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        groupValue: '',
        durationMonths: '20',
        maxMembers: '20',
        commissionRate: '5.0',
        startDate: ''
      });
      await loadChits();
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/chits/${selectedGroup.id}/join`, joinForm);
      setShowJoinModal(false);
      setJoinForm({ customerId: '', slotNumber: '' });
      await reloadSelectedGroup();
    } catch (err) {
      console.error('Failed to join chit group', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConductAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/chits/${selectedGroup.id}/auction`, auctionForm);
      setShowAuctionModal(false);
      setAuctionForm({ installmentNo: '', winningBidderId: '', bidAmount: '' });
      await reloadSelectedGroup();
    } catch (err) {
      console.error('Failed to conduct auction', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayInstallment = async (instId: string) => {
    if (!selectedGroup || !installmentPayAmount) return;
    try {
      setActionLoading(true);
      await axios.post(`/api/chits/${selectedGroup.id}/installment/${instId}/pay`, {
        amount: installmentPayAmount
      });
      await reloadSelectedGroup();
    } catch (err) {
      console.error('Failed to pay installment', err);
    } finally {
      setActionLoading(false);
    }
  };

  const reloadSelectedGroup = async () => {
    await loadChits();
    if (selectedGroup) {
      const res = await axios.get('/api/chits');
      const updated = res.data.find((g: any) => g.id === selectedGroup.id);
      setSelectedGroup(updated || null);
    }
    setInstallmentPayAmount('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 fade-in">
      
      {/* Listing Panel */}
      <div className={`xl:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 ${
        selectedGroup ? 'hidden xl:block' : 'block'
      }`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Swaraj Chit Funds</h2>
            <p className="text-xs text-muted-foreground">Manage mutual savings pools, register subscribers, and resolve monthly bidding discounts.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
          >
            <PlusCircle size={15} />
            <span>Create Chit Group</span>
          </button>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <PiggyBank size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold">No Chit Groups Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group) => (
              <div key={group.id} className="border border-border hover:border-primary/50 transition-colors p-5 rounded-xl space-y-4 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{group.name}</h3>
                    <span className="text-[10px] text-muted-foreground">Term: {group.durationMonths} Mos &bull; Base Contribution: Rs. {group.monthlyContribution.toLocaleString()}/Mo</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${
                    group.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {group.status}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Chit Value</span>
                    <span className="font-extrabold text-foreground">Rs. {group.groupValue.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Enrolled Subscribers</span>
                    <span className="font-bold text-foreground">{group.members.length} / {group.maxMembers}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => selectGroup(group)}
                    className="flex-1 bg-accent hover:bg-primary hover:text-white font-bold py-2 rounded-lg text-[10px] transition-colors text-center"
                  >
                    Open Ledger Desk
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Ledger details slide panel */}
      {selectedGroup && (
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 fade-in">
          
          {/* Panel Header */}
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">{selectedGroup.name}</h3>
              <p className="text-[10px] text-muted-foreground">Ledger & Auction Details</p>
            </div>
            <button
              onClick={() => setSelectedGroup(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Close [X]
            </button>
          </div>

          {/* Quick operations toolbar */}
          {selectedGroup.status === 'ACTIVE' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-primary hover:text-white py-2 rounded-lg text-[10px] font-bold transition-colors"
              >
                <UserPlus size={12} />
                <span>Join Subscriber</span>
              </button>
              <button
                onClick={() => setShowAuctionModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold transition-colors"
              >
                <Hammer size={12} />
                <span>Conduct Auction</span>
              </button>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2 flex justify-between">
              <span>Subscribers ({selectedGroup.members.length})</span>
            </h4>
            
            {selectedGroup.members.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No subscribers registered yet.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 bg-accent/20 p-2.5 rounded-lg pr-1">
                {selectedGroup.members.map((m: any) => (
                  <div key={m.id} className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-muted-foreground">Slot #{m.slotNumber}</span>
                    <span className="font-bold">{m.customer.user.fullName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auctions Completed list */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">Auctions History</h4>
            {selectedGroup.auctions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No auctions held yet. Conduct first auction installment.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {selectedGroup.auctions.map((a: any) => (
                  <div key={a.id} className="border border-border p-2.5 rounded-lg text-[10px] space-y-1 bg-accent/10">
                    <div className="flex justify-between">
                      <span className="font-bold">Round #{a.installmentNo} Winner</span>
                      <span className="font-semibold text-primary">{a.winningBidder.user.fullName}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount Bid: Rs. {a.bidAmount}</span>
                      <span>Dividend: Rs. {a.dividendDistributed}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/40 font-bold text-foreground">
                      <span>Net Contribution</span>
                      <span>Rs. {a.nextInstallmentAmount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collection Receipts dues list */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">Subscriber Collections</h4>
            
            {selectedGroup.installments.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No contributions due at this stage.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                {selectedGroup.installments.map((inst: any) => (
                  <div key={inst.id} className="border border-border p-3 rounded-lg text-[10px] space-y-2">
                    <div className="flex justify-between items-center font-semibold">
                      <span>{inst.customer.user.fullName}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${
                        inst.status === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        Rnd #{inst.installmentNo} &bull; {inst.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Due: {new Date(inst.dueDate).toLocaleDateString()}</span>
                      <span>Req: Rs. {inst.dueAmount}</span>
                    </div>
                    
                    {inst.status !== 'PAID' && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={installmentPayAmount}
                          onChange={(e) => setInstallmentPayAmount(e.target.value)}
                          className="flex-1 bg-accent border border-border rounded p-1 text-[10px] text-right"
                        />
                        <button
                          onClick={() => handlePayInstallment(inst.id)}
                          disabled={actionLoading}
                          className="bg-primary hover:bg-blue-600 text-white font-bold px-3 py-1 rounded text-[9px]"
                        >
                          Collect
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Create Chit Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl fade-in">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base">Create Savings Chit Pool</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground font-semibold">✕</button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="Swaraj Premium 5 Lakhs Chit"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Group Value (Rs.)</label>
                  <input
                    type="number"
                    required
                    placeholder="500000"
                    value={createForm.groupValue}
                    onChange={(e) => setCreateForm({ ...createForm, groupValue: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Admin Fee Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={createForm.commissionRate}
                    onChange={(e) => setCreateForm({ ...createForm, commissionRate: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Tenor (Months)</label>
                  <input
                    type="number"
                    required
                    value={createForm.durationMonths}
                    onChange={(e) => setCreateForm({ ...createForm, durationMonths: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Max Subscribers</label>
                  <input
                    type="number"
                    required
                    value={createForm.maxMembers}
                    onChange={(e) => setCreateForm({ ...createForm, maxMembers: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
              >
                {actionLoading ? 'Creating Chit Group...' : 'Initialize Chit Pool'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Subscriber Modal */}
      {showJoinModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl fade-in">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base">Enroll Subscriber</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-muted-foreground font-semibold">✕</button>
            </div>

            <form onSubmit={handleJoinGroup} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Choose Customer</label>
                <select
                  value={joinForm.customerId}
                  onChange={(e) => setJoinForm({ ...joinForm, customerId: e.target.value })}
                  required
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.user.fullName} ({c.pan})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Assign Slot Number (1 - {selectedGroup.maxMembers})</label>
                <input
                  type="number"
                  min="1"
                  max={selectedGroup.maxMembers}
                  required
                  placeholder="e.g. 5"
                  value={joinForm.slotNumber}
                  onChange={(e) => setJoinForm({ ...joinForm, slotNumber: e.target.value })}
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {actionLoading ? 'Enrolling...' : 'Enroll in Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Conduct Auction Modal */}
      {showAuctionModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl fade-in">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base">Conduct Bidding Auction</h3>
              <button onClick={() => setShowAuctionModal(false)} className="text-muted-foreground font-semibold">✕</button>
            </div>

            <form onSubmit={handleConductAuction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Round Number</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1"
                    value={auctionForm.installmentNo}
                    onChange={(e) => setAuctionForm({ ...auctionForm, installmentNo: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Bid Discount (Rs.)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 35000"
                    value={auctionForm.bidAmount}
                    onChange={(e) => setAuctionForm({ ...auctionForm, bidAmount: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Winning Bidder</label>
                <select
                  value={auctionForm.winningBidderId}
                  onChange={(e) => setAuctionForm({ ...auctionForm, winningBidderId: e.target.value })}
                  required
                  className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none"
                >
                  <option value="">-- Choose Subscriber --</option>
                  {selectedGroup.members.map((m: any) => (
                    <option key={m.customerId} value={m.customerId}>Slot #{m.slotNumber} - {m.customer.user.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-900 text-slate-300 p-3 rounded-lg text-[10px] space-y-1">
                <span className="font-bold text-white block mb-1">📈 Estimated Dividend Yield:</span>
                <p>Admin Fee (5%): Rs. {(selectedGroup.groupValue * 0.05).toLocaleString()}</p>
                <p>Dividend Pool: Rs. {Math.max(0, parseFloat(auctionForm.bidAmount || '0') - (selectedGroup.groupValue * 0.05)).toLocaleString()}</p>
                <p>Prize Paid to Winner: Rs. {(selectedGroup.groupValue - parseFloat(auctionForm.bidAmount || '0')).toLocaleString()}</p>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
              >
                {actionLoading ? 'Processing Auction...' : 'Resolve Auction'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
