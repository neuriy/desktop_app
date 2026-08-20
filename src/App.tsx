import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NeuriyAuthProvider, NeuriyAuthGuard } from '@neuriy/auth';
import { ensureNeuriyAuth } from './lib/neuriy-auth';
import { DesktopPanel } from './components/DesktopPanel';
import { LoginPanel } from './components/LoginPanel';
import { SettingsPanel } from './components/SettingsPanel';

ensureNeuriyAuth();

type Route = 'home' | 'settings';

function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [route, setRoute] = useState<Route>('home');

  useEffect(() => {
    if (window.electron?.onTogglePanel) {
      window.electron.onTogglePanel((visible: boolean) => {
        setIsVisible(visible);
      });
    } else {
      setIsVisible(true);
    }

    window.electron?.onNavigate?.((next) => {
      if (next === 'settings') setRoute('settings');
      else setRoute('home');
    });
  }, []);

  const handleAnimationComplete = () => {
    if (!isVisible && window.electron) {
      window.electron.hidePanel();
    }
  };

  return (
    <NeuriyAuthProvider>
      <div className="w-screen h-screen bg-transparent flex items-start justify-end p-2 overflow-hidden">
        <AnimatePresence onExitComplete={handleAnimationComplete}>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="origin-top-right"
            >
              {route === 'settings' ? (
                <SettingsPanel onBack={() => setRoute('home')} />
              ) : (
                <NeuriyAuthGuard
                  fallback={
                    <div className="w-[360px] h-[500px] rounded-[24px] bg-zinc-900/95 border border-white/10 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  }
                  unauthenticated={<LoginPanel />}
                >
                  {() => <DesktopPanel onOpenSettings={() => setRoute('settings')} />}
                </NeuriyAuthGuard>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NeuriyAuthProvider>
  );
}

export default App;
