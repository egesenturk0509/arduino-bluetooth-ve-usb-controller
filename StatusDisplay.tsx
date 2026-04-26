/**
 * Arabanın ve bağlantının anlık durumunu gösteren bileşen.
 */

import { ConnectionStatus } from "./bluetooth";

interface Props {
  status: ConnectionStatus;
  deviceName: string | null;
  isSystemActive: boolean;
}

export default function StatusDisplay({ status, deviceName, isSystemActive }: Props) {
  return (
    <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Cihaz:</span>
        <span className="text-gray-800 font-black">{deviceName || "Bilinmiyor"}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Bağlantı:</span>
        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase border ${
          status === "Bağlandı" ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"
        }`}>
          {status}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Sistem Durumu:</span>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isSystemActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-gray-300"}`} />
          <span className={`font-black ${isSystemActive ? "text-emerald-600" : "text-gray-400"}`}>
            {isSystemActive ? "AKTİF" : "BEKLEMEDE"}
          </span>
        </div>
      </div>
    </div>
  );
}