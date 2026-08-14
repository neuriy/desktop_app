import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Search } from 'lucide-react';

export function TopBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/10 backdrop-blur-md">
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full shadow-sm" />
        <span className="font-semibold text-sm text-white">Neuriy</span>
      </div>
      <div className="flex items-center space-x-3 text-white/80">
        <Search size={16} className="cursor-pointer hover:text-white transition-colors" />
        <Wifi size={16} />
        <BatteryMedium size={16} />
        <span className="text-sm font-medium tracking-wide">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
