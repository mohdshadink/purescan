"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap, Camera, Video, ArrowRight, Info } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import CameraModal from "@/components/CameraModal";
import HolographicCard from "@/components/HolographicCard";
import { useVoice } from "@/hooks/useVoice";
import { useTheme } from "next-themes";
import FloatingLines from "@/components/FloatingLines";

// Hack to fix Vercel build error with react-dropzone and framer-motion types
const MotionDivAsAny = motion.div as any;
const MotionLabelAsAny = motion.label as any;

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const { analyze, isLoading, error, result, clearError } = useAnalysis();
  const { speak } = useVoice();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Voice synthesis effect on result
  useEffect(() => {
    if (result && !isLoading) {
      const summary = `Analysis Complete. Bio Safety Score: ${result.score}. Status: ${result.status}`;
      speak(summary);
    }
  }, [result, isLoading, speak]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setFiles([file]);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      clearError();
      analyze([file]);
      event.target.value = '';
    }
  };

  const isDarkMode = theme === 'dark' || !theme;

  // Background Glow Logic
  const getBackgroundGlow = () => {
    if (!result) return "";
    if (result.score > 70) return "bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.15)_0%,_transparent_70%)] transition-colors duration-700";
    if (result.score < 40) return "bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.15)_0%,_transparent_70%)] transition-colors duration-700";
    return "";
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      console.log("Mobile upload started", acceptedFiles[0]?.name); // Debug log
      setFiles(acceptedFiles);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (acceptedFiles.length > 0) {
        if (typeof window !== 'undefined' && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
        setPreviewUrl(URL.createObjectURL(acceptedFiles[0]));
        clearError();
        analyze(acceptedFiles);
      }
    },
    [analyze, clearError, previewUrl]
  );

  const handleCapturedImage = (file: File) => {
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    setIsCameraOpen(false);
    setFiles([file]);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    clearError();
    analyze([file]);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
  });

  const resetScan = () => {
    setFiles([]);
    setPreviewUrl(null);
    clearError();
    window.location.reload();
  };

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen w-full overflow-hidden selection:bg-organic-gold/30">

      {/* FloatingLines Animated Background - Bio-Organic DNA */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <FloatingLines
          linesGradient={["#FFBA00", "#6D9773", "#0C3B2E"]}
          topWavePosition={{ x: 10.0, y: 0.5, rotate: -0.4 }}
          middleWavePosition={{ x: 5.0, y: 0.0, rotate: 0.2 }}
          bottomWavePosition={{ x: 2.0, y: -0.7, rotate: -1 }}
          animationSpeed={0.8}
          interactive={true}
          bendRadius={2.5}
          bendStrength={-0.6}
          mouseDamping={0.04}
          parallax={true}
          parallaxStrength={0.1}
          lineDistance={[20]}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen pt-16 px-6">

        {/* Modern Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4 max-w-3xl"
        >

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight pb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] drop-shadow-sm">
              PureScan AI
            </span>
          </h1>

          <p className="text-[var(--foreground)] opacity-70 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-light mb-20">
            Instantly decode food quality. Upload ingredients or products to reveal bio-organic safety, freshness, and hidden additives.
          </p>
        </motion.div>

        {/* Content Area */}
        <div className="w-full flex flex-col items-center gap-8">

          {/* Image Preview (Sticky) */}
          <AnimatePresence>
            {previewUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotateX: -20 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                className="relative group perspective-1000"
              >
                <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-3xl overflow-hidden border-2 border-[var(--card-border)] shadow-2xl bg-black/50">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                {/* Reflection/Glow underneath */}
                <div className="absolute -inset-4 bg-gradient-to-t from-[var(--color-primary)]/20 to-transparent blur-xl -z-10 rounded-full opacity-60" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Interaction Zone */}
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {/* UPLOAD STATE */}
              {!result && !isLoading && (
                <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
                  {/* TOP ROW: Two Base Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* CARD 1: Standard Camera (Simple Photo) */}
                    <HolographicCard
                      onClick={() => {
                        setIsLiveMode(false);
                        setIsCameraOpen(true);
                      }}
                      className={`
                        flex flex-col items-center justify-center p-10 rounded-3xl cursor-pointer transition-all shadow-xl
                        ${isDarkMode
                          ? 'bg-white/5 border border-white/10 hover:border-organic-gold/50 hover:scale-105 hover:shadow-2xl'
                          : 'bg-white/80 border border-black/5 hover:border-organic-gold/30 hover:scale-105 hover:shadow-2xl'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`p-4 rounded-2xl mb-4 shadow-inner border ${isDarkMode ? 'bg-organic-gold/10 border-organic-gold/20' : 'bg-organic-gold/5 border-organic-gold/10'}`}>
                          <Camera className="h-8 w-8 text-organic-gold" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">Scan with Camera</h3>
                        <p className="text-[var(--foreground)] opacity-50 text-sm font-medium">Take Photo</p>
                      </div>
                    </HolographicCard>

                    {/* CARD 2: File Upload */}
                    <HolographicCard
                      isActive={isDragActive}
                      className={`
                        flex flex-col items-center justify-center p-10 rounded-3xl cursor-pointer transition-all shadow-xl
                        ${isDarkMode
                          ? 'bg-white/5 border border-white/10 hover:border-organic-gold/50 hover:scale-105 hover:shadow-2xl'
                          : 'bg-white/80 border border-black/5 hover:border-organic-gold/30 hover:scale-105 hover:shadow-2xl'
                        }
                      `}
                    >
                      {/* Inner content with dropzone */}
                      <div {...getRootProps()} className="flex flex-col items-center w-full h-full justify-center">
                        <input
                          {...getInputProps()}
                          onClick={(e) => {
                            // Prevent double-firing on mobile
                            e.stopPropagation();
                          }}
                        />
                        <div className={`p-4 rounded-2xl mb-4 shadow-inner border ${isDarkMode ? 'bg-organic-sage/10 border-organic-sage/20' : 'bg-organic-sage/5 border-organic-sage/10'}`}>
                          <UploadCloud className="h-8 w-8 text-organic-sage" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">Tap to Analyze</h3>
                        <p className="text-[var(--foreground)] opacity-50 text-sm font-medium">Upload File</p>
                      </div>
                    </HolographicCard>
                  </div>

                  {/* BOTTOM ROW: Advanced Option (Centered) */}
                  <div className="w-full md:w-1/2 flex justify-center">
                    <HolographicCard
                      onClick={() => {
                        setIsLiveMode(true);
                        setIsCameraOpen(true);
                      }}
                      className={`
                        w-full flex flex-col items-center justify-center p-10 rounded-3xl cursor-pointer transition-all shadow-xl
                        ${isDarkMode
                          ? 'bg-white/5 border border-white/10 hover:border-organic-gold/50 hover:scale-105 hover:shadow-2xl'
                          : 'bg-white/80 border border-black/5 hover:border-organic-gold/30 hover:scale-105 hover:shadow-2xl'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`p-4 rounded-2xl mb-4 shadow-inner border ${isDarkMode ? 'bg-teal-500/10 border-teal-500/20' : 'bg-teal-500/5 border-teal-500/10'}`}>
                          <Video className="h-8 w-8 text-teal-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">Smart Vision</h3>
                        <p className="text-[var(--foreground)] opacity-50 text-sm font-medium text-center">Real-time AI targeting with manual scope. Identify produce, meats, and ingredient labels instantly.</p>
                      </div>
                    </HolographicCard>
                  </div>
                </div>
              )}

              {/* LOADING STATE */}
              {isLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-12 bg-glass rounded-[2rem] shadow-2xl"
                >
                  <LoadingSpinner />
                  <div className="mt-8 flex flex-col items-center gap-2">
                    <p className="text-[var(--color-primary)] font-bold tracking-widest animate-pulse">ANALYZING SPECIMEN</p>
                    <p className="text-xs text-[var(--foreground)] opacity-50 font-mono">Running spectrographic algorithms...</p>
                  </div>
                </motion.div>
              )}

              {/* RESULT STATE */}
              {result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full rounded-3xl p-8 bg-white shadow-xl dark:bg-gray-900/50 dark:border dark:border-gray-800 dark:shadow-none text-gray-900 dark:text-white"
                  style={{ backgroundColor: !isDarkMode ? '#ffffff' : undefined }}
                >
                  {/* Title Header */}
                  <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--foreground)] mb-4">
                    {result.title}
                  </h2>

                  {/* Health Score */}
                  <p className="text-lg font-mono text-[var(--foreground)] opacity-80 mb-6">
                    HEALTH SCORE: <span className="font-bold text-2xl">{result.score}</span>/10
                  </p>

                  {/* Status Banner */}
                  <div className={`w-full py-4 px-6 rounded-xl mb-8 text-center font-bold text-xl uppercase tracking-widest text-white
                    ${result.status === 'Safe' ? 'bg-green-500' :
                      result.status === 'Moderate' ? 'bg-yellow-500 text-gray-900' :
                        result.status === 'Non-Food' ? 'bg-blue-500' : 'bg-red-500'}`}
                  >
                    {result.status === 'Safe' && <CheckCircle className="inline h-6 w-6 mr-2 -mt-1" />}
                    {result.status === 'Moderate' && <AlertTriangle className="inline h-6 w-6 mr-2 -mt-1" />}
                    {result.status === 'Hazardous' && <XCircle className="inline h-6 w-6 mr-2 -mt-1" />}
                    {result.status === 'Non-Food' && <Info className="inline h-6 w-6 mr-2 -mt-1" />}
                    {result.status}
                  </div>

                  {/* Findings List */}
                  {result.findings && result.findings.length > 0 && (
                    <div className="bg-gray-50 border border-transparent dark:bg-white/5 dark:border-white/5 rounded-2xl p-6 mb-6"
                      style={{ border: !isDarkMode ? '1px solid #94a3b8' : undefined }}
                    >
                      <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] opacity-60 mb-4">Findings</h4>
                      <ul className="space-y-3">
                        {result.findings.map((finding, index) => (
                          <li key={index} className="flex items-start gap-3 text-[var(--foreground)]">
                            <ArrowRight className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-base">{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-2xl p-6 mb-8">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-2">Recommendation</h4>
                    <p className="text-[var(--foreground)] text-lg font-medium">
                      {result.recommendation}
                    </p>
                  </div>

                  <button
                    onClick={resetScan}
                    className="w-full py-5 rounded-2xl bg-gray-900 hover:bg-black text-white dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-transparent dark:border-white/5 hover:scale-[1.02] active:scale-[0.98] shadow-lg dark:shadow-none"
                    style={{
                      backgroundColor: !isDarkMode ? '#111827' : undefined,
                      color: !isDarkMode ? '#ffffff' : undefined
                    }}
                  >
                    <RefreshCw className="h-5 w-5" /> New Analysis
                  </button>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && <ErrorMessage message={error} />}

          <CameraModal
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onCapture={handleCapturedImage}
            enableLiveDetection={isLiveMode}
          />

        </div>

        {/* Footer Text */}
        <div className="w-full flex justify-center pb-4 mt-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium uppercase tracking-widest text-organic-sage/50 dark:text-organic-sage/40">
            <Zap size={10} className="opacity-50" /> Bio-Organic Analysis v1.0
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
