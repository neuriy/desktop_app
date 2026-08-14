import React from 'react';
import { TopBar } from './TopBar';
import { FaceCanvas } from './FaceAI';

export function DesktopPanel() {
  return (
    <div className="w-[360px] h-[500px] rounded-[24px] bg-gradient-to-br from-zinc-800/90 to-zinc-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
      <TopBar />
      <div className="flex-1 relative flex flex-col items-center justify-center">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-purple-500/20 blur-[70px] rounded-full pointer-events-none" />
        
        {/* Face AI */}
        <div className="w-full h-[280px] relative z-10 -mt-8">
          <FaceCanvas theme="dark" isSpeaking={false} />
        </div>

        {/* Minimal input area */}
        <div className="absolute bottom-6 w-full px-6 z-10">
          <div className="w-full bg-black/40 rounded-full h-12 flex items-center px-4 border border-white/5 backdrop-blur-md shadow-inner transition-colors hover:border-white/10 hover:bg-black/50">
            <span className="text-white/40 text-sm">Ask Neuriy anything...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
