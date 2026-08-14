import { useState } from 'react';
import { GraduationCap, WifiOff, Mail, Chrome, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/data/supabaseClient';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';

export function Landing() {
  const { setMode } = useApp();
  const { toast } = useToast();
  const [view, setView] = useState<'choose' | 'email-signin' | 'email-signup'>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOffline = () => {
    setMode('offline');
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      setMode('online');
    } catch (err: any) {
      toast(err.message || 'Google sign-in failed', 'error');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMode('online');
    } catch (err: any) {
      toast(err.message || 'Sign-in failed', 'error');
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast('Account created. You are now signed in.', 'success');
      setMode('online');
    } catch (err: any) {
      toast(err.message || 'Sign-up failed', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md animate-fade-in">
        {/* Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size={72} className="mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students Academics Manager</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Manage classes, marks, assignments and academic reports.
          </p>
        </div>

        {view === 'choose' && (
          <div className="card p-6 space-y-3 animate-slide-up">
            <button
              onClick={handleOffline}
              className="btn-primary w-full justify-start py-3.5"
            >
              <WifiOff className="w-5 h-5" />
              Continue Offline
            </button>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="btn-secondary w-full justify-start py-3.5"
            >
              <Chrome className="w-5 h-5" />
              Sign in with Google
            </button>
            <button
              onClick={() => setView('email-signin')}
              className="btn-secondary w-full justify-start py-3.5"
            >
              <Mail className="w-5 h-5" />
              Sign in with Email
            </button>
            <button
              onClick={() => setView('email-signup')}
              className="btn-ghost w-full justify-start py-3.5"
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </button>

            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
                Offline data stays only on this device and will not be synced when you later sign in.
              </p>
            </div>
          </div>
        )}

        {(view === 'email-signin' || view === 'email-signup') && (
          <div className="card p-6 animate-slide-up">
            <button
              onClick={() => setView('choose')}
              className="btn-ghost -ml-2 mb-4 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {view === 'email-signin' ? 'Sign in with Email' : 'Create Account'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={view === 'email-signin' ? 'current-password' : 'new-password'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      view === 'email-signin' ? handleEmailSignIn() : handleEmailSignUp();
                    }
                  }}
                />
              </div>
              <button
                onClick={view === 'email-signin' ? handleEmailSignIn : handleEmailSignUp}
                disabled={loading || !email || !password}
                className="btn-primary w-full mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {view === 'email-signin' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400 dark:text-gray-500">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Developed by Jeevan Varghese</span>
        </div>
      </div>
    </div>
  );
}
