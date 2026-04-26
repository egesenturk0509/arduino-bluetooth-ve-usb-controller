/**
 * Yön tuşlarını içeren ve basılı tutulduğunda sürekli komut gönderen bileşen.
 */

"use client";

import { useRef } from "react";
import { Command } from "./bluetooth";

interface Props {
  sendCommand: (cmd: string) => void;
  disabled: boolean;
}

export default function DirectionPad({ sendCommand, disabled }: Props) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRepeating = (cmd: Command) => {
    if (disabled) return;
    
    // Önceki interval'ı temizle (güvenlik için)
    stopRepeating();
    
    // Hemen ilk komutu gönder
    sendCommand(cmd);
    
    // Her 100ms'de bir tekrarla
    intervalRef.current = setInterval(() => {
      sendCommand(cmd);
    }, 100);
  };

  const stopRepeating = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const DirectionButton = ({ cmd, label, icon }: { cmd: Command, label: string, icon: string }) => (
    <button
      onMouseDown={() => startRepeating(cmd)}
      onMouseUp={stopRepeating}
      onMouseLeave={stopRepeating}
      onTouchStart={() => startRepeating(cmd)}
      onTouchEnd={stopRepeating}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center w-20 h-20 rounded-3xl 
        transition-all duration-75 select-none
        ${disabled ? "bg-gray-50 text-gray-200" : `bg-white border-2 border-gray-100 text-blue-600 shadow-md active:scale-90 active:bg-blue-50 active:border-blue-200`}
      `}
      aria-label={label}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-[10px] mt-1 font-bold">{label}</span>
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-4 p-6 bg-white rounded-[3rem] shadow-2xl border border-gray-50">
      <div />
      <DirectionButton 
        cmd={Command.FORWARD} 
        label="İLERİ" 
        icon="▲" 
      />
      <div />

      <DirectionButton 
        cmd={Command.LEFT} 
        label="SOL" 
        icon="◀" 
      />
      <div />
      <DirectionButton 
        cmd={Command.RIGHT} 
        label="SAĞ" 
        icon="▶" 
      />

      <div />
      <DirectionButton 
        cmd={Command.BACKWARD} 
        label="GERİ" 
        icon="▼" 
      />
      <div />
    </div>
  );
}