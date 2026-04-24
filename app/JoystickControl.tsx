"use client";
import React, { useState } from 'react';

export default function JoystickControl({ sendCommand }: { sendCommand: (c: string) => void }) {
  const [parkActive, setParkActive] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-4">
      <div className="grid grid-cols-5 gap-4 items-center">
        {/* Sol Sütun - Su Sık */}
        <div className="col-start-1 row-start-2">
          <button 
            onMouseDown={() => sendCommand("P")} onMouseUp={() => sendCommand("p")}
            className="w-16 h-16 md:w-20 md:h-20 bg-blue-500 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center text-[10px] gap-1"
          >
            <span className="text-2xl">💧</span>
            SU SIK
          </button>
        </div>

        {/* Orta Joystick Kümesi */}
        <div className="col-start-3 row-start-1 flex justify-center">
           <button 
            onMouseDown={() => sendCommand("F")} onMouseUp={() => sendCommand("S")}
            className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-xl flex items-center justify-center text-2xl active:bg-blue-500 active:text-white transition-colors shadow-sm"
          >
            ▲
          </button>
        </div>

        <div className="col-start-2 row-start-2 flex justify-center">
          <button 
            onMouseDown={() => sendCommand("L")} onMouseUp={() => sendCommand("S")}
            className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-xl flex items-center justify-center text-2xl active:bg-blue-500 active:text-white transition-colors shadow-sm"
          >
            ◀
          </button>
        </div>

        <div className="col-start-3 row-start-2 flex justify-center">
          <button 
            onMouseDown={() => sendCommand("H")} onMouseUp={() => sendCommand("h")}
            className="w-16 h-16 md:w-20 md:h-20 bg-yellow-400 text-black rounded-xl font-bold shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center text-[10px] gap-1"
          >
            <span className="text-2xl">📢</span>
            KORNA
          </button>
        </div>

        <div className="col-start-4 row-start-2 flex justify-center">
          <button 
            onMouseDown={() => sendCommand("R")} onMouseUp={() => sendCommand("S")}
            className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-xl flex items-center justify-center text-2xl active:bg-blue-500 active:text-white transition-colors shadow-sm"
          >
            ▶
          </button>
        </div>

        <div className="col-start-3 row-start-3 flex justify-center">
          <button 
            onMouseDown={() => sendCommand("B")} onMouseUp={() => sendCommand("S")}
            className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-xl flex items-center justify-center text-2xl active:bg-blue-500 active:text-white transition-colors shadow-sm"
          >
            ▼
          </button>
        </div>

        {/* Sağ Sütun - Park Sensörü */}
        <div className="col-start-5 row-start-2">
          <button 
            onClick={() => {
              const newState = !parkActive;
              setParkActive(newState);
              sendCommand(newState ? "X" : "x");
            }}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl font-bold shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center text-[10px] gap-1 ${parkActive ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            <span className="text-2xl">🅿️</span>
            {parkActive ? 'PARK KAPAT' : 'PARK AÇ'}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 font-medium italic text-center">Oklar: Hareket, Korna/Su: Basılı Tut, Park: Aç/Kapat</p>
    </div>
  );
}