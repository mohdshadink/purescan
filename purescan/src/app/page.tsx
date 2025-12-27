"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap, Moon, Sun, Camera } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import CameraModal from "@/components/CameraModal";
import HolographicCard from "@/components/HolographicCard";
import { useVoice } from "@/hooks/useVoice";

// Hack to fix Vercel build error with react-dropzone and framer-motion types
const MotionDivAsAny = motion.div as any;
const MotionLabelAsAny = motion.label as any;

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { analyze, isLoading, error, result, clearError } = useAnalysis();
  const { speak } = useVoice();

  // Voice synthesis effect on result
  useEffect(() => {
    if (result && !isLoading) {
      const summary = `Analysis Complete. Bio Safety Score: ${result.score}. Status: ${result.status}`;
      speak(summary);
    }
  }, [result, isLoading, speak]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  // Ref not strictly needed with label wrap, but keeping for safety if needed later, though removing direct click handler
  // const cameraInputRef = useRef<HTMLInputElement>(null); // Removed unused ref

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setFiles([file]);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      clearError();
      analyze([file]);
      // Reset value to allow re-selection
      event.target.value = '';
    }
  };

  const activeTheme = isDarkMode ? "dark" : "light";

  // Background Glow Logic
  const getBackgroundGlow = () => {
    if (!result) return "";
    if (result.score > 70) return "bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.15)_0%,_transparent_70%)] transition-colors duration-700";
    if (result.score < 40) return "bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.15)_0%,_transparent_70%)] transition-colors duration-700";
    return "";
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
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
    // Maintain theme on reload if possible, but for now simple reload refetches default
    // Ideally we don't fully reload window, just reset state, but keeping existing logic:
    window.location.reload();
  };

  return (
    <main className={`flex min-h-screen flex-col items-center relative overflow-hidden font-sans transition-colors duration-500 ${!isDarkMode ? 'light' : ''}`}
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Theme Toggle (Absolute Top Right) */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-glass hover:bg-white/10 transition-all border border-white/10 shadow-lg group"
        aria-label="Toggle Theme"
      >
        {isDarkMode ? (
          <Sun className="h-6 w-6 text-yellow-400 group-hover:rotate-90 transition-transform" />
        ) : (
          <Moon className="h-6 w-6 text-indigo-600 group-hover:-rotate-12 transition-transform" />
        )}
      </button>

      {/* Dynamic Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />

      <Navbar />

      <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center space-y-10 z-10 px-4 py-8 md:py-12">

        {/* Modern Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-glass border border-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] shadow-lg">
            <Zap size={12} className="fill-current" /> Bio-Organic Analysis v1.0
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight pb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] drop-shadow-sm">
              PureScan AI
            </span>
          </h1>

          <p className="text-[var(--foreground)] opacity-70 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-light">
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
                  {isLoading && (
                    <div className="absolute inset-0 bg-green-500/10 z-20">
                      <div className="w-full h-0.5 bg-[var(--color-primary)] shadow-[0_0_20px_var(--color-primary)] absolute top-0 animate-[scan_2s_italic_infinite]" />
                    </div>
                  )}
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
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full">
                  {/* CARD 1: File Upload */}
                  <HolographicCard
                    onClick={getRootProps().onClick}
                    isActive={isDragActive}
                    className={`
                      flex-1 flex flex-col items-center justify-center p-8 rounded-3xl cursor-pointer
                      ${isDarkMode
                        ? 'bg-white/5 border border-white/10'
                        : 'bg-white border border-gray-200 shadow-xl'
                      }
                    `}
                  >
                    {/* Inner content */}
                    <div {...getRootProps()} className="flex flex-col items-center">
                      <input {...getInputProps()} />
                      <div className={`p-4 rounded-2xl mb-4 shadow-inner border ${isDarkMode ? 'bg-white/5 border-white/5 text-green-400' : 'bg-green-50 border-green-100 text-green-600'}`}>
                        <UploadCloud className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--foreground)] mb-1">Tap to Analyze</h3>
                      <p className="text-[var(--foreground)] opacity-50 text-sm font-medium">Upload File</p>
                    </div>
                  </HolographicCard>

                  {/* CARD 2: Camera */}
                  <HolographicCard
                    onClick={() => setIsCameraOpen(true)}
                    className={`
                      flex-1 flex flex-col items-center justify-center p-8 rounded-3xl cursor-pointer
                      ${isDarkMode
                        ? 'bg-white/5 border border-white/10'
                        : 'bg-white border border-gray-200 shadow-xl'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center">
                      <div className={`p-4 rounded-2xl mb-4 shadow-inner border ${isDarkMode ? 'bg-white/5 border-white/5 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                        <Camera className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--foreground)] mb-1">Scan with Camera</h3>
                      <p className="text-[var(--foreground)] opacity-50 text-sm font-medium">Take Photo</p>
                    </div>
                  </HolographicCard>
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
                  className={`
                    w-full bg-white/5 backdrop-blur-xl rounded-3xl p-8 border 
                    ${result.score >= 70 ? 'border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)]' :
                      result.score < 40 ? 'border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)]' :
                        'border-white/10'}
                  `}
                >
                  {/* Background Gradient for result card */}
                  <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${result.score >= 70 ? 'from-green-500/20' : result.score >= 30 ? 'from-yellow-500/20' : 'from-red-500/20'} to-transparent blur-3xl -z-10`} />

                  {/* Result Header */}
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h2 className={`text-4xl md:text-5xl font-black flex items-center gap-4 ${result.score >= 70 ? 'text-green-500' : result.score >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {result.score >= 70 && <CheckCircle className="h-10 w-10" />}
                        {result.score >= 30 && result.score < 70 && <AlertTriangle className="h-10 w-10" />}
                        {result.score < 30 && <XCircle className="h-10 w-10" />}
                        {result.status}
                      </h2>
                      <p className="text-[var(--foreground)] opacity-60 text-sm mt-2 font-medium tracking-wide">Analysis Complete</p>
                    </div>
                    <div className="text-right bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                      <span className="block text-4xl font-mono font-bold text-[var(--foreground)]">{result.score}</span>
                      <span className="text-[10px] text-[var(--foreground)] opacity-50 uppercase tracking-widest">Quality Score</span>
                    </div>
                  </div>

                  {/* Range Bar */}
                  <div className="mb-10">
                    <div className="h-6 w-full bg-black/10 rounded-full overflow-hidden border border-[var(--card-border)] p-1.5 backdrop-blur-sm">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.score}%` }}
                        transition={{ duration: 1.2, ease: "circOut" }}
                        className={`h-full rounded-full shadow-[0_0_20px_currentColor] ${result.score >= 70 ? 'bg-green-500 text-green-500' : result.score >= 30 ? 'bg-yellow-500 text-yellow-500' : 'bg-red-500 text-red-500'}`}
                      />
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] uppercase text-[var(--foreground)] opacity-50 font-bold tracking-widest px-2">
                      <span className="text-red-500">Hazardous</span>
                      <span className="text-yellow-500">Moderate</span>
                      <span className="text-green-500">Premium</span>
                    </div>
                  </div>

                  {/* Granular Metrics Radar (Viz) */}
                  {result.metrics && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {Object.entries(result.metrics).map(([key, value]) => (
                        <div key={key} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                          <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">{key}</span>
                          <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${value}%` }}
                              className={`h-full rounded-full ${key === 'toxicity' ? 'bg-red-500' :
                                key === 'processing' ? 'bg-yellow-500' :
                                  key === 'nutrition' ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                            />
                          </div>
                          <span className="text-xs font-mono self-end">{value}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Details */}
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5 mb-8 hover:bg-white/10 transition-colors">
                    <p className="text-[var(--foreground)] leading-relaxed text-base font-light">
                      {result.details}
                    </p>
                  </div>

                  <button
                    onClick={resetScan}
                    className="w-full py-5 rounded-2xl bg-white/10 hover:bg-white/20 text-[var(--foreground)] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-white/5 hover:scale-[1.02] active:scale-[0.98]"
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
          />

        </div>
      </div>

      <Footer />
    </main>
  );
}
