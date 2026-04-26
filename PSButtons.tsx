/**
 * PS kontrolcü ikonlarını andıran aksiyon butonları ve sistem kontrolleri.
 */

"use client";

import { useRef } from "react";
import { Command } from "./bluetooth";

interface Props {
  sendCommand: (cmd: string) => void;
  onStart: () => void;
  isConnected: boolean;
}

export default function PSButtons({ sendCommand, onStart, isConnected }: Props) {
  const pumpIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPump = () => {
    if (!isConnected) return;
    sendCommand(Command.WATER_PUMP);
    pumpIntervalRef.current = setInterval(() => sendCommand(Command.WATER_PUMP), 100);
  };

  const stopPump = () => {
    if (pumpIntervalRef.current) {
      clearInterval(pumpIntervalRef.current);
      pumpIntervalRef.current = null;
    }
  };

  const ActionButton = ({ onClick, color, icon, label, onDown, onUp }: any) => (
    <button
      onClick={onClick}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={onDown}
      onTouchEnd={onUp}
      disabled={!isConnected}
      className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all active:scale-90 disabled:opacity-10 ${color}`}
    >
      <span className="text-3xl font-black">{icon}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-8 items-center">
      {/* Üst Kısım: Sistem Kontrolleri */}
      <div className="flex gap-4">
        <button
          onClick={onStart}
          disabled={!isConnected}
          className="px-6 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg active:scale-95 disabled:opacity-30 uppercase tracking-tighter"
        >
          SİSTEMİ BAŞLAT
        </button>
        <button
          onClick={() => sendCommand(Command.EMERGENCY_STOP)}
          disabled={!isConnected}
          className="px-6 py-3 bg-red-600 text-white font-black rounded-xl shadow-lg active:scale-95 disabled:opacity-30 uppercase tracking-tighter"
        >
          ACİL DUR
        </button>
      </div>

      {/* Alt Kısım: PS Geometrisi */}
      <div className="grid grid-cols-2 gap-6 relative">
        <ActionButton icon="△" color="bg-white text-green-500" onClick={() => sendCommand(Command.HEADLIGHTS)} />
        <ActionButton icon="◯" color="bg-white text-red-500" onClick={() => sendCommand(Command.PARK_SENSOR)} />
        <ActionButton icon="◻" color="bg-white text-pink-500" onClick={() => sendCommand(Command.STATUS)} />
        <ActionButton 
          icon="💧" 
          color="bg-blue-500 text-white" 
          onDown={startPump} 
          onUp={stopPump} 
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="text-[8px] text-gray-300 font-black tracking-[0.3em] uppercase">Control</div>
        </div>
      </div>
    </div>
  );
}