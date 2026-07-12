import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User as UserIcon, Phone, AlertCircle } from 'lucide-react';
import { UserRole } from '../../../shared/src/types';

export default function Login() {
  const { login, googleSignIn, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (isForgot) {
        // Handle forgot password
        const axios = (await import('axios')).default;
        await axios.post('/api/auth/forgot-password', { email });
        setInfo('If the account exists, a recovery link has been dispatched to your email.');
        setIsForgot(false);
      } else if (isRegister) {
        // Handle register
        await register(email, password, fullName, phone, role);
        setInfo('Account created successfully.');
        navigate(role === UserRole.CUSTOMER ? '/portal' : '/dashboard');
      } else {
        // Handle login
        await login(email, password);
        // Redirect based on role check in context
        const axios = (await import('axios')).default;
        const checkRes = await axios.post('/api/auth/refresh');
        const userRole = checkRes.data.user.role;
        if (userRole === UserRole.CUSTOMER) {
          navigate('/portal');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication attempt failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      // Simulate Google Client Payload
      const mockUid = Math.random().toString(36).substring(2, 15);
      await googleSignIn(
        'customer1@gmail.com', // fallback to seeded email for testability
        'Amit Patel',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
        mockUid
      );
      navigate('/portal');
    } catch (err: any) {
      setError('Google authenticating failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950 text-slate-100 font-sans">
      
      {/* Brand Visual Column (Desktop) */}
      <div className="hidden lg:flex lg:col-span-7 bg-[#0b192c] flex-col justify-between p-12 border-r border-slate-900 relative overflow-hidden">
        {/* Abstract Background details */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-2xl -z-10"></div>

        <div className="flex items-center gap-4 bg-slate-950/20 p-4 rounded-2xl border border-slate-900 w-fit">
          <img src="/logo.jpg" alt="Swaraj Private Limited Logo" className="h-16 rounded-xl object-contain bg-white p-1" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">Swaraj Pvt. Limited</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Trust &bull; Growth &bull; Together</p>
          </div>
        </div>

        <div className="space-y-6 max-w-lg">
          <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-semibold">
            Enterprise Credit AI Platform
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Sovereign Trust. Modern Wealth.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Finance management software tailored for chit funds, local credit lenders, and LIC insurance agencies. Powered by predictive AI risk profiling.
          </p>
        </div>

        <div className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Swaraj Pvt. Limited. All rights reserved. Registered under NBFC guidelines.
        </div>
      </div>

      {/* Auth Card Column */}
      <div className="lg:col-span-5 flex flex-col justify-center p-8 sm:p-12 md:p-16 bg-slate-950">
        <div className="w-full max-w-md mx-auto space-y-8">
          
          {/* Header Mobile Brand */}
          <div className="lg:hidden flex items-center gap-3 mb-6 bg-[#0b192c] p-3 rounded-xl border border-slate-900">
            <img src="/logo.jpg" alt="Swaraj Private Limited Logo" className="h-10 rounded-lg bg-white p-0.5 object-contain" />
            <div>
              <h1 className="text-sm font-bold text-white uppercase">Swaraj Pvt. Limited</h1>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest">Trust &bull; Growth &bull; Together</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-white">
              {isForgot ? 'Recover Password' : isRegister ? 'Create Account' : 'Welcome Back'}
            </h3>
            <p className="text-sm text-slate-400">
              {isForgot 
                ? 'Enter your email to receive recovery instructions.' 
                : isRegister 
                  ? 'Join our lending or investment networks today.' 
                  : 'Log in to manage chits, check loans, or trace LIC premiums.'
              }
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
              <AlertCircle size={16} />
              <span>{info}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="Amit Patel"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="9555555555"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Account Role Type</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value={UserRole.CUSTOMER}>Customer Subscriber</option>
                    <option value={UserRole.AGENT}>LIC Agent / Field Broker</option>
                    <option value={UserRole.STAFF}>Lending Staff Operations</option>
                    <option value={UserRole.ADMIN}>Branch Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {!isForgot && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-400">Password</label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading 
                ? 'Authenticating...' 
                : isForgot 
                  ? 'Request Recovery Email' 
                  : isRegister 
                    ? 'Complete Registration' 
                    : 'Sign In Credentials'
              }
            </button>
          </form>

          {/* Quick seeded login panel for testability */}
          {!isForgot && !isRegister && (
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-normal space-y-1">
              <span className="font-bold text-white text-xs block mb-1">💡 Sandbox Admin & Backoffice Credentials:</span>
              <p>Admin: <code className="text-primary">admin@swarajfinance.com</code> / <code className="text-primary">password123</code></p>
              <p>Super Admin: <code className="text-primary">superadmin@swarajfinance.com</code> / <code className="text-primary">password123</code></p>
              <p>Customer: <code className="text-primary">customer1@gmail.com</code> / <code className="text-primary">password123</code></p>
            </div>
          )}

          {!isForgot && !isRegister && (
            <div className="space-y-4">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-900"></div>
                <span className="flex-shrink mx-4 text-slate-600 text-xs font-semibold uppercase tracking-wider">Or</span>
                <div className="flex-grow border-t border-slate-900"></div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2.5"
              >
                <img
                  src="https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=32&h=32&fit=crop"
                  alt="Google"
                  className="w-4 h-4 rounded-full object-cover"
                />
                Google Single Sign-In
              </button>
            </div>
          )}

          <div className="text-center">
            {isForgot ? (
              <button
                type="button"
                onClick={() => setIsForgot(false)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Back to Sign In
              </button>
            ) : (
              <p className="text-xs text-slate-400">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-primary font-bold hover:underline"
                >
                  {isRegister ? 'Sign In' : 'Create Account'}
                </button>
              </p>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
