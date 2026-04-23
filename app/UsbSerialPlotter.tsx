"use client";
import { useState, useEffect, useRef } from "react";

export default function UsbSerialPlotter({ port }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<number[]>([]);

  useEffect(() => {
    if (!port) return;
    let reader: any;

    const readData = async () => {
      reader = port.readable.getReader();
      const decoder = new TextDecoder();
      let partialLine = "";

      try {
        if (port.readable.locked) {
          setTimeout(readData, 50);
          return;
        }

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          partialLine += decoder.decode(value, { stream: true });
          const lines = partialLine.split('\n');
          partialLine = lines.pop() || "";

          for (const line of lines) {
            const match = line.match(/[\d.]+/);
            const num = match ? parseFloat(match[0]) : NaN;
            if (!isNaN(num)) {
              setPoints(prev => [...prev, num].slice(-100));
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        reader.releaseLock();
      }
    };

    readData();
    return () => reader?.cancel();
  }, [port]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 3;
    
    const step = canvas.width / 100;
    // Otomatik Ölçeklendirme: Ekrandaki noktaların en büyüğünü tavan yap
    const currentMax = Math.max(...points, 1);
    const currentMin = Math.min(...points, 0);
    const range = (currentMax - currentMin) || 1;

    points.forEach((p, i) => {
      const x = i * step;
      const y = canvas.height - ((p - currentMin) / range) * (canvas.height * 0.9) - (canvas.height * 0.05);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [points]);

  return (
    <div className="space-y-4 flex flex-col items-center">
      <h2 className="font-bold text-gray-700 uppercase">USB Seri Çizici (0 - 1024)</h2>
      <canvas ref={canvasRef} width={800} height={400} className="bg-gray-50 rounded-3xl border-2 shadow-inner w-full max-w-3xl" />
      <p className="text-xs text-gray-400">Arduino'dan Serial.println() ile gönderilen sayıları çizer.</p>
    </div>
  );
}