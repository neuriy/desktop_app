import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DesktopPanel } from './components/DesktopPanel';

function App() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for toggle events from Electron
    if (window.electron && window.electron.onTogglePanel) {
      window.electron.onTogglePanel((visible: boolean) => {
        setIsVisible(visible);
      });
    } else {
      // Fallback for browser dev mode
      setIsVisible(true);
    }
  }, []);

  const handleAnimationComplete = () => {
    if (!isVisible && window.electron) {
      window.electron.hidePanel();
    }
  };

  return (
    <div className="w-screen h-screen bg-transparent flex items-start justify-end p-2 overflow-hidden">
      <AnimatePresence onExitComplete={handleAnimationComplete}>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="origin-top-right"
          >
            <DesktopPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
