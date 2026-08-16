import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithYahoo,
  redirectToNeuriyLogin,
} from '@neuriy/auth';
import { NID_LOGIN_URL } from '../lib/neuriy-auth';

export function LoginPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const runAuth = async (action: () => Promise<unknown>) => {
    setIsLoading(true);
    setError('');
    try {
      await action();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message.replace('Firebase: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    void runAuth(() => signInWithEmail(email, password));
  };

  const openNeuriyIdWeb = () => {
    // Prefer Electron shell so OAuth works outside the frameless panel
    if (window.electron?.openExternal) {
      window.electron.openExternal(`${NID_LOGIN_URL}/auth/login`);
      return;
    }
    redirectToNeuriyLogin(NID_LOGIN_URL);
  };

  return (
    <div className="w-[360px] h-[500px] rounded-[24px] bg-gradient-to-br from-zinc-800/95 to-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.25),_transparent_55%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full px-6 pt-6 pb-4">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-tr from-violet-500 to-sky-400 rounded-full shadow-sm" />
          <span className="font-semibold text-sm text-white tracking-wide">Neuriy</span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white mb-1"
        >
          Sign in
        </motion.h1>
        <p className="text-white/50 text-sm mb-4">
          Use your Neuriy nID — same account as the IDHook login web app.
        </p>

        <form onSubmit={handleEmailContinue} className="space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/35"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/35"
          />

          {error && (
            <p className="text-red-400 text-xs text-center py-1" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-2.5 rounded-full transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Signing in…' : 'Continue'}
          </button>
        </form>

        <div className="flex items-center gap-2 my-3 opacity-60">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-white/50 text-[10px] font-semibold tracking-wider">OR</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void runAuth(() => signInWithGoogle())}
            className="w-full bg-transparent hover:bg-white/10 border border-white/20 text-white text-sm font-medium py-2 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            Continue with Google
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void runAuth(() => signInWithYahoo())}
            className="w-full bg-transparent hover:bg-white/10 border border-white/20 text-white text-sm font-medium py-2 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            Continue with Yahoo
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={openNeuriyIdWeb}
            className="w-full bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/40 text-white text-sm font-medium py-2 rounded-2xl transition-all"
          >
            Open Neuriy ID web login
          </button>
        </div>

        <p className="mt-auto pt-3 text-[10px] text-white/35 text-center leading-relaxed">
          Powered by <span className="text-white/55">@neuriy/auth</span> from IDHook
        </p>
      </div>
    </div>
  );
}
