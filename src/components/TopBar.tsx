import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, LogOut } from 'lucide-react';
import { signOut, useNeuriyAuth } from '@neuriy/auth';

export function TopBar() {
  const [time, setTime] = useState(new Date());
  const { user } = useNeuriyAuth();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const label = user?.displayName || user?.email?.split('@')[0] || 'Neuriy';

  return (
    <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/10 backdrop-blur-md">
      <div className="flex items-center space-x-2 min-w-0">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="w-5 h-5 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-5 h-5 bg-gradient-to-tr from-violet-500 to-sky-400 rounded-full shadow-sm shrink-0" />
        )}
        <span className="font-semibold text-sm text-white truncate" title={user?.email ?? undefined}>
          {label}
        </span>
      </div>
      <div className="flex items-center space-x-3 text-white/80 shrink-0">
        <button
          type="button"
          onClick={() => void signOut()}
          title="Sign out"
          className="hover:text-white transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={15} />
        </button>
        <Wifi size={16} />
        <BatteryMedium size={16} />
        <span className="text-sm font-medium tracking-wide">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
