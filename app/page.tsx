/**
 * Uygulamanın ana giriş sayfası.
 */

"use client";
import { useState, useEffect } from "react";
import BluetoothView from "./BluetoothView";
import UsbView from "./UsbView";

declare global {
  interface Navigator {
    bluetooth: Bluetooth;
    serial: {
      requestPort(): Promise<any>;
    };
  }
  interface Bluetooth extends EventTarget {
    requestDevice(options?: any): Promise<any>;
  }
  interface BluetoothRemoteGATTServer {
    connect(): Promise<any>;
    disconnect(): void;
    connected: boolean;
    device: any;
  }
  interface BluetoothRemoteGATTService {
    getCharacteristic(uuid: string): Promise<any>;
    device: any;
  }
}

export default function Home() {
  const [characteristic, setCharacteristic] = useState<any>(null);
  const [status, setStatus] = useState("Bağlı Değil");
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<"bluetooth" | "usb" | null>(null);
  const [baudRate, setBaudRate] = useState("9600");
  const [usbPort, setUsbPort] = useState<any>(null);
  const [usbWriter, setUsbWriter] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const baudRates = [
    "50", "75", "110", "134.5", "150", "200", "300", "600", "1200", "1800",
    "2400", "4800", "7200", "9600", "14400", "19200", "28800", "31250",
    "38400", "57600", "76800", "115200", "128000", "153600", "230400",
    "250000", "256000", "460800", "500000", "576000", "921600", "1000000",
    "1152000", "1228800", "1382400", "1500000", "1843200", "2000000",
    "2500000", "3000000", "3686400", "4000000"
  ];

  useEffect(() => {
    const savedLogin = localStorage.getItem("isLoggedIn") || sessionStorage.getItem("isLoggedIn");
    if (savedLogin === "true") setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      document.title = "Arduino Controller - Giriş Yap";
      return;
    }

    const tabLabels: Record<string, string> = {
      rgb: "RGB LED",
      terminal: "BT Terminal",
      joystick: "Joystick",
      buttons: "Butonlar",
      keypad: "4x4 Tuş Takımı",
      voice: "Ses Terminali",
      usb_monitor: "USB Monitör",
      usb_plotter: "USB Çizici",
      gyro_analiz: "Gyro Analiz Paneli"
    };

    let title = "Arduino Controller";

    if (connectionMode === "bluetooth") {
      const statusText = characteristic ? "(Bağlı)" : "(Bağlı Değil)";
      const tabName = activeTab ? tabLabels[activeTab] : "Bluetooth Kontrol";
      title = `${tabName} ${statusText}`;
    } else if (connectionMode === "usb") {
      const statusText = usbWriter ? "(Bağlı)" : "(Bağlı Değil)";
      const tabName = activeTab ? tabLabels[activeTab] : "USB Kontrol";
      title = `${tabName} ${statusText}`;
    }

    document.title = title;
  }, [isLoggedIn, connectionMode, activeTab, characteristic, usbWriter]);

  const addLog = (message: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 50));
  };

  const connectUSB = async () => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: Number(baudRate) });
      const writer = port.writable.getWriter();
      setUsbPort(port);
      setUsbWriter(writer);
      setStatus("USB Bağlı");
      addLog("USB Seri bağlantı başarılı!");
    } catch (err: any) {
      setStatus("USB Bağlantı Hatası");
      addLog("USB Hatası: " + err.message);
    }
  };

  const disconnectUSB = async () => {
    if (usbWriter) {
      try {
        await usbWriter.close();
        usbWriter.releaseLock();
      } catch (e) {}
    }
    if (usbPort) {
      try {
        await usbPort.close();
      } catch (e) {}
    }
    setUsbWriter(null);
    setUsbPort(null);
    setStatus("Bağlı Değil");
    addLog("USB bağlantısı kesildi.");
  };

  // Baud hızı değiştiğinde USB bağlantısı aktifse otomatik yenile
  useEffect(() => {
    const updateConnection = async () => {
      if (usbPort && usbWriter && status === "USB Bağlı") {
        try {
          addLog(`Baud hızı ${baudRate} olarak güncelleniyor, bağlantı yenileniyor...`);
          // Önce mevcut kilitleri ve portu serbest bırak
          await usbWriter.close();
          usbWriter.releaseLock();
          await usbPort.close();
          
          // Yeni baud hızıyla aynı portu tekrar aç
          await usbPort.open({ baudRate: Number(baudRate) });
          setUsbWriter(usbPort.writable.getWriter());
          addLog("Bağlantı yeni baud hızıyla başarıyla yenilendi.");
        } catch (err: any) {
          addLog("Otomatik baud yenileme hatası: " + err.message);
          disconnectUSB();
        }
      }
    };
    updateConnection();
  }, [baudRate]);

  const connectBT = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["0000ffe0-0000-1000-8000-00805f9b34fb"] }],
        optionalServices: ["0000ffe0-0000-1000-8000-00805f9b34fb"],
      });
      setStatus("Bağlanıyor...");
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService("0000ffe0-0000-1000-8000-00805f9b34fb");
      const char = await service?.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb");
      setCharacteristic(char);
      setStatus("Bağlandı");
      addLog(`Bağlanılan Cihaz: ${device.name}`);
    } catch (err: any) {
      setStatus("Hata");
      addLog("BT Hatası: " + err.message);
    }
  };

  const disconnectBT = () => {
    if (characteristic?.service?.device?.gatt?.connected) {
      characteristic.service.device.gatt.disconnect();
    }
    setCharacteristic(null);
    setStatus("Bağlı Değil");
  };

  const sendCommand = async (cmd: string) => {
    const encoder = new TextEncoder();
    if (characteristic) {
      try { await characteristic.writeValue(encoder.encode(cmd)); } catch (e) {}
    }
    if (usbWriter) {
      try { await usbWriter.write(encoder.encode(cmd)); } catch (e) {}
    }
  };

  const handleLogin = () => {
    if (username.trim() === "ege.senturk" && password === "ege0514") {
      setIsLoggedIn(true);
      if (rememberMe) localStorage.setItem("isLoggedIn", "true");
      else sessionStorage.setItem("isLoggedIn", "true");
    } else {
      alert("Yanlış kullanıcı adı veya şifre!");
    }
  };

  // Çıkış yaparken tüm gezinti durumlarını sıfırla
  const handleLogout = () => {
    setIsLoggedIn(false);
    setConnectionMode(null);
    setActiveTab(null);
    // Bağlantıları da kesmek istersen burada disconnect fonksiyonlarını çağırabilirsin
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6">
          <h2 className="text-3xl font-bold text-center text-gray-800">Giriş Yap</h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-black"
            placeholder="Kullanıcı Adı"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Şifre"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10">
              <span className="relative text-xl">
                👁️
                {showPassword && (
                  <div className="absolute top-1/2 left-1/2 w-full h-[2px] bg-black -translate-x-1/2 -translate-y-1/2 -rotate-45" />
                )}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="rem" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            <label htmlFor="rem" className="text-sm text-gray-600">Beni Hatırla</label>
          </div>
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">Giriş Yap</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="w-full p-6 border-b flex flex-col items-center bg-gray-50 gap-4">
        <div className="w-full flex justify-between items-center max-w-6xl">
          <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Arduino Controller</h1>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase transition-all active:scale-95 shadow-md">Çıkış Yap</button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bluetooth Durum:</span>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${characteristic ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
              {characteristic ? "BAĞLANDI" : "BAĞLI DEĞİL"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">USB Durum:</span>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${usbWriter ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
              {usbWriter ? "BAĞLANDI" : "BAĞLI DEĞİL"}
            </span>
          </div>

          <div className="flex gap-2">
            {characteristic ? (
              <button onClick={disconnectBT} className="bg-red-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px]">BT KES</button>
            ) : (
              <button onClick={connectBT} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px]">BLUETOOTH BAĞLAN</button>
            )}
            {usbWriter ? (
              <button onClick={disconnectUSB} className="bg-red-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px]">USB KES</button>
            ) : (
              <button onClick={connectUSB} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px]">USB BAĞLAN</button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {connectionMode === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <button onClick={() => setConnectionMode("bluetooth")} className="aspect-video bg-white border border-gray-100 shadow-xl rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform group">
              <span className="text-6xl">📱</span>
              <span className="font-bold text-gray-400 group-hover:text-blue-600 uppercase tracking-widest">Bluetooth Kontrol</span>
            </button>
            <button onClick={() => setConnectionMode("usb")} className="aspect-video bg-white border border-gray-100 shadow-xl rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform group">
              <span className="text-6xl">🔌</span>
              <span className="font-bold text-gray-400 group-hover:text-emerald-600 uppercase tracking-widest">USB Kontrol</span>
            </button>
          </div>
        ) : connectionMode === "bluetooth" ? (
          <BluetoothView 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setConnectionMode={setConnectionMode}
            sendCommand={sendCommand}
            logs={logs}
            addLog={addLog}
            deviceName={characteristic?.service?.device?.name || "Bilinmiyor"}
            connectionStatus={status as any}
            isConnected={!!characteristic}
          />
        ) : (
          <UsbView 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setConnectionMode={setConnectionMode}
            usbPort={usbPort}
            sendCommand={sendCommand}
          />
        )}
      </main>

      {/* Sağ Alt Baud Seçimi - Sabit */}
      <div className="fixed bottom-6 right-6 bg-white border border-gray-100 p-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex items-center gap-3 z-50 transition-all hover:scale-105">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Baud Rate</label>
        <select 
          value={baudRate} 
          onChange={(e) => setBaudRate(e.target.value)}
          className="text-xs font-black outline-none bg-gray-50 px-3 py-1.5 rounded-lg cursor-pointer text-blue-600"
        >
          {baudRates.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
    </div>
  );
}