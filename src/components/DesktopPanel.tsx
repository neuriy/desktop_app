import React, { useEffect, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { FaceCanvas } from './FaceAI';
import { useNeuriyAuth } from '@neuriy/auth';
import { Settings, SendHorizontal } from 'lucide-react';
import { askElloFive, checkElloFiveHealth, getElloFiveModel } from '../lib/ellofive';

interface DesktopPanelProps {
  onOpenSettings?: () => void;
}

export function DesktopPanel({ onOpenSettings }: DesktopPanelProps) {
  const { user } = useNeuriyAuth();
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('Checking ElloFive…');
  const [busy, setBusy] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const health = await checkElloFiveHealth();
      if (cancelled) return;
      setStatus(
        health.ok
          ? `ElloFive · ${getElloFiveModel()} online`
          : 'ElloFive offline — start ellofive api'
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    setIsSpeaking(true);
    setReply('');
    setStatus('ElloFive thinking…');
    try {
      const result = await askElloFive(text);
      if (result.ok) {
        setReply(result.output);
        setStatus(`ElloFive · ${result.model}`);
        setPrompt('');
      } else {
        setReply(result.error || 'ElloFive error');
        setStatus('ElloFive error');
      }
    } finally {
      setBusy(false);
      setIsSpeaking(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="w-[360px] h-[500px] rounded-[24px] bg-gradient-to-br from-zinc-800/90 to-zinc-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
      <TopBar onOpenSettings={onOpenSettings} />
      <div className="flex-1 relative flex flex-col items-center justify-center min-h-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-violet-500/20 blur-[70px] rounded-full pointer-events-none" />

        <div className="w-full h-[200px] relative z-10 -mt-4 shrink-0">
          <FaceCanvas theme="dark" isSpeaking={isSpeaking} />
        </div>

        <p className="text-white/45 text-[11px] z-10 px-4 text-center shrink-0">
          Signed in as {firstName} · powered by{' '}
          <a
            href="https://github.com/EricksonAtHome/ElloFive"
            target="_blank"
            rel="noreferrer"
            className="text-violet-300/90 hover:text-violet-200 underline-offset-2 hover:underline"
          >
            ElloFive
          </a>
        </p>
        <p className="text-white/30 text-[10px] mt-0.5 z-10 shrink-0">{status}</p>

        {reply && (
          <div
            className="mx-4 mt-2 mb-1 max-h-[88px] overflow-y-auto z-10 w-[calc(100%-2rem)] rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-[12px] text-white/80 leading-relaxed whitespace-pre-wrap"
            role="status"
          >
            {reply}
          </div>
        )}

        <form
          className="mt-auto mb-5 w-full px-5 z-10 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex-1 bg-black/40 rounded-full h-12 flex items-center px-4 border border-white/5 backdrop-blur-md shadow-inner focus-within:border-white/20">
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
              placeholder="Ask ElloFive anything…"
              className="w-full bg-transparent text-sm text-white placeholder-white/35 outline-none disabled:opacity-60"
              aria-label="Message ElloFive"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !prompt.trim()}
            className="h-12 w-12 rounded-full bg-violet-500/25 border border-violet-400/40 text-white/90 hover:bg-violet-500/40 flex items-center justify-center disabled:opacity-40"
            aria-label="Send to ElloFive"
          >
            <SendHorizontal size={16} />
          </button>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="h-12 w-12 rounded-full bg-black/40 border border-white/5 text-white/60 hover:text-white hover:border-white/15 flex items-center justify-center"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
