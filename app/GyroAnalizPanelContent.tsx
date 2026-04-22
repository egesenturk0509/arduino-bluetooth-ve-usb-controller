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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [points, setPoints] = useState<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef(0);
  const keepReading = useRef(true);

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
      try {
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

            if (yonMatch && dereceMatch) {
              let rawYon = yonMatch[1].toLowerCase();
              let formatliYon = rawYon === "ileri" ? "İleri" : rawYon.charAt(0).toLocaleUpperCase('tr-TR') + rawYon.slice(1);
              
              // Analog veriyi (0-1024) Dereceye (0-180) dönüştür
              const rawVal = parseFloat(dereceMatch[1]);
              const convertedVal = (rawVal * 180) / 1024;

              setGyroData({ yon: formatliYon, derece: convertedVal });
              setPoints(prev => [...prev, convertedVal].slice(-100));
              
              counterRef.current += 1;
              const uniqueId = `${Date.now()}-${counterRef.current}-${Math.random().toString(36).substring(2, 9)}`;
              
              setHistory((prev: HistoryItem[]) => {
                const newHistory = [...prev, { time: getFullTimestamp(), data: cleanValue, id: counterRef.current, uid: uniqueId }];
                return newHistory.slice(-100);
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
    const maxVal = 180; // Derece bazlı ölçek

    points.forEach((p, i) => {
      const x = i * step;
      const y = canvas.height - (p / maxVal) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [points]);

  const getAlertStyle = () => {
    const d = gyroData.derece;
    if (d >= 3) return { bg: 'bg-red-600', text: '⚠️ Acil Tahliye ⚠️', opacity: 'opacity-100 scale-100' };
    if (d >= 2) return { bg: 'bg-orange-500', text: 'Tehlike!', opacity: 'opacity-100 scale-100' };
    if (d >= 1) return { bg: 'bg-yellow-400', text: 'Dikkat!', opacity: 'opacity-100 scale-100' };
    return { bg: 'bg-transparent', text: '', opacity: 'opacity-0 scale-95' };
  };

  const alertBox = getAlertStyle();

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

        <div className={`md:col-span-2 p-8 rounded-[30px] text-center transition-all duration-500 min-h-[100px] flex items-center justify-center shadow-lg ${alertBox.bg} ${alertBox.opacity}`}>
          <div className="text-white text-4xl font-black tracking-wide drop-shadow-md">
            {alertBox.text}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sol Panel: Seri Monitör */}
        <div className="bg-white rounded-[30px] shadow-lg h-[480px] overflow-hidden flex flex-col border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">Seri Monitör</span>
            <button onClick={() => { setHistory([]); setPoints([]); counterRef.current = 0; }} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors px-6 py-2 rounded-xl text-xs font-bold shadow-sm border-0 uppercase tracking-widest">Geçmişi Sil</button>
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
              <button onClick={() => { setHistory([]); setPoints([]); counterRef.current = 0; }} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors px-6 py-2 rounded-xl text-xs font-bold shadow-sm border-0 uppercase tracking-widest">Geçmişi Sil</button>
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