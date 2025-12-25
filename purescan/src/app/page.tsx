"use client";

import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import Scanner from "@/components/Scanner";
import ScoreGauge from "@/components/ScoreGauge";
import { useAnalysis } from "@/hooks/useAnalysis";
import { Zap, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Home() {
  const { analyzeImage, analyzing, result, error, demoMode, toggleDemoMode } = useAnalysis();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleUpload = (file: File) => {
    setImageFile(file);
    // Auto start analysis on upload
    analyzeImage(file);
  };

  const reset = () => {
    setImageFile(null);
    // result is cleared by useAnalysis on new call, but we want UI reset
    window.location.reload(); // Simple reset for now or state clear
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background Elements - Subtle Scan Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,255,0,0.05)_1px,transparent_1px)] bg-[size:100%_4px]" />

      <div className="z-10 w-full max-w-2xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon/30 text-xs font-scanner text-neon cursor-pointer select-none hover:bg-primary/10 transition-colors"
            onClick={toggleDemoMode}
            title="Double click for Demo Mode"
          >
            <Zap size={14} className={cn(demoMode && "fill-current")} />
            <span>PureScan SYSTEM v2.0 {demoMode && "[SIMULATION]"}</span>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter text-white font-scanner leading-tight" style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
            PURE<span className="text-neon">SCAN</span>
          </h1>
          <p className="text-gray-400 font-scanner text-xs tracking-widest uppercase">Bio-Organic Quality Analysis Unit</p>
        </div>

        {/* Main Interface */}
        <div className="relative">
          <div className="relative bg-glass rounded-none border-l-4 border-r-4 border-neon/50 p-8 shadow-2xl">

            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon" />

            {/* Scanner Overlay */}
            <Scanner scanning={analyzing} className="rounded-none border border-white/5" />

            {/* Content */}
            <div className="space-y-8">
              {!imageFile ? (
                <div className="border border-dashed border-neon/50 bg-primary/5 p-12 text-center rounded-none hover:bg-primary/10 transition-colors relative group">
                  <ImageUpload onImageSelect={handleUpload} />
                  <div className="absolute inset-0 pointer-events-none border border-transparent group-hover:border-neon/20 transition-colors" />
                </div>
              ) : (
                <div className="relative aspect-video rounded-none overflow-hidden border border-neon/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Analyzed food"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay during scanning */}
                  {analyzing && <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />}
                  {/* Grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                </div>
              )}

              {/* Results Area */}
              <div className="min-h-[140px] flex items-center justify-center">
                {analyzing ? (
                  <div className="text-center space-y-4 w-full">
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-neon w-[50%] animate-[shimmer_2s_infinite_linear]" style={{ background: 'linear-gradient(90deg, transparent, var(--primary), transparent)' }} />
                    </div>
                    <p className="div-neon text-neon font-scanner text-sm custom-pulse">ANALYZING SPECIMEN DATA...</p>
                  </div>
                ) : result ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-6"
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold font-scanner text-white">{result.score}</span>
                          <span className="text-xs text-gray-500 font-scanner uppercase">/ 100 Quality Index</span>
                        </div>
                        <div className="h-2 w-full bg-gray-800 mt-2">
                          <div className="h-full bg-neon transition-all duration-1000" style={{ width: `${result.score}%`, backgroundColor: result.score >= 80 ? 'var(--primary)' : result.score >= 50 ? 'orange' : 'var(--danger)' }} />
                        </div>
                      </div>

                      <div className={cn("px-4 py-2 border text-sm font-scanner uppercase tracking-wider",
                        result.score >= 80 ? "border-neon text-neon" :
                          result.score >= 50 ? "border-yellow-500 text-yellow-500" :
                            "border-red-500 text-red-500"
                      )}>
                        {result.score >= 80 ? "OPTIMAL" : result.score >= 50 ? "ACCEPTABLE" : "HAZARDOUS"}
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 border-l-2 border-neon font-mono text-sm text-gray-300 leading-relaxed">
                      <span className="text-neon block mb-2 text-xs uppercase opacity-70">Analysis Report //</span>
                      {result.text}
                    </div>

                    <button
                      onClick={reset}
                      className="w-full py-4 bg-neon/10 border border-neon text-neon font-scanner uppercase tracking-widest hover:bg-neon hover:text-black transition-all duration-300"
                    >
                      Initialize New Scan
                    </button>
                  </motion.div>
                ) : error ? (
                  <div className="text-red-500 text-center font-scanner border border-red-500/30 p-4 bg-red-500/5">
                    <p className="uppercase tracking-wide mb-2"><AlertTriangle className="inline mr-2 mb-1" size={16} /> System Error</p>
                    <p className="text-sm opacity-80">{error}</p>
                    <button onClick={() => setImageFile(null)} className="text-xs underline mt-4 hover:text-white">RETRY SEQUENCE</button>
                  </div>
                ) : (
                  <div className="text-center text-gray-600 font-scanner text-xs uppercase tracking-[0.2em] animate-pulse">
                    Waiting for input stream...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[10px] text-gray-600 font-scanner uppercase">
          <span>Sys.Status: ONLINE</span>
          <span>Gemini Core v1.5 [CONNECTED]</span>
        </div>

      </div>
    </main>
  );
}
