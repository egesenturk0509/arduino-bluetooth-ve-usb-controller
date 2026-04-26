/**
 * Tüm kontrol bileşenlerini ve Bluetooth hook'unu birleştiren ana konteyner.
 */

"use client";

import { useState } from "react";
import { useBluetoothDevice } from "./useBluetoothDevice";
import { Command } from "./bluetooth";
import StatusDisplay from "./StatusDisplay";
import DirectionPad from "./DirectionPad";
import PSButtons from "./PSButtons";

export default function BluetoothController() {
  const { 
    isConnected, 
    status, 
    deviceName, 
    error, 
    connectToDevice, 
    disconnectDevice, 
    sendCommand 
  } = useBluetoothDevice();

  const [isSystemActive, setIsSystemActive] = useState(false);

  const handleStartSystem = () => {
    sendCommand(Command.START_SYSTEM);
    setIsSystemActive(true);
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto p-4 select-none">
      {/* Başlık ve Bağlantı Butonları */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-black text-white tracking-tighter">
          AR <span className="text-blue-500">DUINO</span> CONTROLLER
        </h1>
        
        <div className="flex gap-2">
          {!isConnected ? (
            <button
              onClick={connectToDevice}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg transition-all"
            >
              BAĞLAN
            </button>
          ) : (
            <button
              onClick={disconnectDevice}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-lg transition-all"
            >
              KES
            </button>
          )}
        </div>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="w-full p-3 bg-red-900/30 border border-red-500 text-red-200 text-sm rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Durum Göstergesi */}
      <StatusDisplay 
        status={status} 
        deviceName={deviceName} 
        isSystemActive={isSystemActive && isConnected} 
      />

      {/* Kontrol Paneli Izgarası */}
      <div className="w-full flex flex-col md:flex-row items-center justify-around gap-12 mt-4">
        <DirectionPad sendCommand={sendCommand} disabled={!isConnected || !isSystemActive} />
        
        <PSButtons 
          sendCommand={sendCommand} 
          onStart={handleStartSystem} 
          isConnected={isConnected} 
        />
      </div>
    </div>
  );
}