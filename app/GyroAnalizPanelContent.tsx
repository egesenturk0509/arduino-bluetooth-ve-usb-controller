"use client";
import React, { useState, useEffect, useRef } from 'react';

interface HistoryItem {
  time: string;
  data: string;
  id: number;
  uid: string;
}

export default function GyroAnalizPanelContent({ port }: { port: any }) {
  const [gyroData, setGyroData] = useState({ yon: 'Stabil', derece: 0 });
  const [alertStatus, setAlertStatus] = useState({ 
    level: 'stabil', 
    text: '', 
    bg: 'bg-transparent' 
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [points, setPoints] = useState<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef(0);
  const keepReading = useRef(true);
  const alertTimeoutRef = useRef<any>(null);

  const getFullTimestamp = () => {
    const now = new Date();
    const date = now.toLocaleDateString('tr-TR');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${date} - ${h}:${m}:${s}.${ms}`;
  };

  useEffect(() => {
    if (!port || !port.readable) return;

    let reader: ReadableStreamDefaultReader | null = null;

    const startReading = async () => {
      keepReading.current = true;
      counterRef.current = 0; // Bağlanınca sayacı sıfırla (1'den başlaması için)
      try {
        if (port.readable.locked) {
          // Eğer stream kilitliyse (başka bir panel henüz bırakmamışsa) kısa bir süre bekleyip tekrar dene
          setTimeout(startReading, 50);
          return;
        }

        reader = port.readable.getReader();
        const decoder = new TextDecoder();
        let partialLine = "";

        while (keepReading.current) {
          const { value, done } = await reader!.read();
          if (done) break;
          
          partialLine += decoder.decode(value, { stream: true });
          const lines = partialLine.split('\n');
          partialLine = lines.pop() || "";

          for (const line of lines) {
            const cleanValue = line.trim();
            if (!cleanValue) continue;
            
            const yonMatch = cleanValue.match(/Yon:\s*(\w+)/);
            const dereceMatch = cleanValue.match(/Derece:\s*([\d.]+)/);
            const durumMatch = cleanValue.match(/Durum:\s*(.+)/i);

            // Yön ve Derece Güncelleme
            if (yonMatch || dereceMatch) {
              let rawYon = yonMatch ? yonMatch[1].toLowerCase() : gyroData.yon;
              let formatliYon = rawYon === "ileri" ? "İleri" : rawYon.charAt(0).toLocaleUpperCase('tr-TR') + rawYon.slice(1);

              // Eğer gelen yön bilgisi "stabil" ise tehlike uyarısını hemen kaldır
              if (yonMatch && yonMatch[1].toLowerCase() === "stabil") {
                setAlertStatus({ level: 'stabil', text: '', bg: 'bg-transparent' });
                if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
              }
              
              let convertedVal = gyroData.derece;
              if (dereceMatch) {
                const rawVal = parseFloat(dereceMatch[1]);
                // Eğer Arduino zaten 0-180 gönderiyorsa dönüşümü kaldırabilirsin, 
                // ama 0-1024 geliyorsa bu mantık doğrudur:
                convertedVal = (rawVal * 180) / 1024;
              }

              setGyroData({ yon: formatliYon, derece: convertedVal });
              setPoints(prev => [...prev, convertedVal].slice(-100));
            }

            // Durum ve Renkli Çubuk Mantığı
            if (durumMatch) {
              // Eski zamanlayıcıyı temizle
              if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
              
              // 2 saniye boyunca yeni durum gelmezse stabil yap (Reset sonrası takılmayı önler)
              alertTimeoutRef.current = setTimeout(() => {
                setAlertStatus({ level: 'stabil', text: '', bg: 'bg-transparent' });
              }, 2000);

              const statusText = durumMatch[1].trim().toLowerCase();
              if (statusText.includes("dikkat")) {
                setAlertStatus({ level: 'dikkat', text: 'Dikkat!', bg: 'bg-[#ffff00] text-black' });
              } else if (statusText.includes("tehlike")) {
                setAlertStatus({ level: 'tehlike', text: 'Tehlike!', bg: 'bg-[#ff7f00] text-white' });
              } else if (statusText.includes("acil tahliye")) {
                setAlertStatus({ level: 'acil', text: '⚠️ Acil Tahliye', bg: 'bg-[#ff0000] text-white' });
              } else {
                setAlertStatus({ level: 'stabil', text: '', bg: 'bg-transparent' });
              }
            }

            // Seri Monitör Geçmişi (Her satırı ekle)
            if (cleanValue) {
              const currentId = ++counterRef.current; // Değeri hemen artır ve yakala
              const uniqueId = `${Date.now()}-${currentId}`;
              
              setHistory(prev => {
                const newItem = { 
                  time: getFullTimestamp(), 
                  data: cleanValue, 
                  id: currentId, // Yakalanan ID'yi kullan
                  uid: uniqueId 
                };
                return [...prev, newItem].slice(-100);
              });
            }
          }
        }
      } catch (err) {
        console.error("Gyro Panel Okuma Hatası:", err);
      } finally {
        if (reader) reader.releaseLock();
      }
    };

    startReading();

    return () => {
      keepReading.current = false;
      if (reader) reader.cancel().catch(() => {});
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [port]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [history]);

  // Grafik Çizim Mantığı
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Izgara Çizgileri
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (canvas.height / 5) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6"; // Mavi çizgi
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    
    const step = canvas.width / 100;
    // Arduino IDE Plotter mantığı: Verideki max ve min değerleri bul ve ekrana yay
    const currentMax = Math.max(...points, 5); // En az 5'e böl ki 0'da titremesin
    const currentMin = Math.min(...points, 0);
    const range = (currentMax - currentMin) || 1;

    points.forEach((p, i) => {
      const x = i * step;
      const y = canvas.height - ((p - currentMin) / range) * (canvas.height * 0.8) - (canvas.height * 0.1);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [points]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-10 rounded-[30px] text-center shadow-lg border border-slate-100 transition-all hover:shadow-xl">
          <span className="text-slate-400 font-bold tracking-widest uppercase text-sm">Yön</span>
          <div className="text-6xl font-black mt-4 tracking-tight text-slate-800">{gyroData.yon}</div>
        </div>
        <div className="bg-white p-10 rounded-[30px] text-center shadow-lg border border-slate-100 transition-all hover:shadow-xl">
          <span className="text-slate-400 font-bold tracking-widest uppercase text-sm">Derece</span>
          <div className="text-6xl font-mono font-bold mt-4 text-blue-600">{gyroData.derece.toFixed(2)}°</div>
        </div>

        <div className={`md:col-span-2 p-8 rounded-[30px] text-center transition-all duration-500 min-h-[100px] flex items-center justify-center shadow-lg ${alertStatus.bg} ${alertStatus.text ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="text-4xl font-black tracking-wide drop-shadow-sm uppercase">
            {alertStatus.text}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sol Panel: Seri Monitör */}
        <div className="bg-white rounded-[30px] shadow-lg h-[480px] overflow-hidden flex flex-col border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">Seri Monitör</span>
            <button onClick={() => { 
              setHistory([]); 
              setPoints([]); 
              counterRef.current = 0;
              setAlertStatus({ level: 'stabil', text: '', bg: 'bg-transparent' });
              if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
            }} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors px-6 py-2 rounded-xl text-xs font-bold shadow-sm border-0 uppercase tracking-widest">Geçmişi Sil</button>
          </div>
          <div className="flex-1 flex flex-col bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-200 flex gap-8 font-bold text-slate-500 text-[11px] uppercase tracking-wider">
              <span className="w-12">No</span>
              <span className="w-52">Tarih Ve Saat</span>
              <span>Gyro Verisi</span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 font-mono text-[13px]">
              {history.length > 0 && history.map((item: HistoryItem) => (
                <div key={item.uid} className="flex gap-8 border-b border-slate-200/50 py-3 hover:bg-white/50 transition-colors">
                  <span className="w-12 text-slate-400 font-bold">{item.id}</span>
                  <span className="w-52 text-blue-600 font-bold">{item.time}</span>
                  <span className="font-black text-slate-800">{item.data}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ Panel: Grafik Çizici */}
        <div className="bg-white rounded-[30px] shadow-lg h-[480px] overflow-hidden flex flex-col border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">Derece Grafiği (0-180°)</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-blue-600 font-mono font-bold text-lg">{gyroData.derece.toFixed(2)}°</span>
              </div>
              <button onClick={() => { 
                setHistory([]); 
                setPoints([]); 
                counterRef.current = 0;
                setAlertStatus({ level: 'stabil', text: '', bg: 'bg-transparent' });
                if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
              }} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors px-6 py-2 rounded-xl text-xs font-bold shadow-sm border-0 uppercase tracking-widest">Geçmişi Sil</button>
            </div>
          </div>
          <div className="flex-1 relative bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
            <canvas ref={canvasRef} width={600} height={300} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}