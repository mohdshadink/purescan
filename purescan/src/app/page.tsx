"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap, Camera, ArrowRight, Info } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import CameraModal from "@/components/CameraModal";
import HolographicCard from "@/components/HolographicCard";
import { useVoice } from "@/hooks/useVoice";
import { useTheme } from "next-themes";

// Hack to fix Vercel build error with react-dropzone and framer-motion types
const MotionDivAsAny = motion.div as any;
const MotionLabelAsAny = motion.label as any;

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
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

  const isDarkMode = theme === 'dark' || !theme; // Default to dark safe

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
    // Maintain theme on reload if possible, but for now simple reload refetches default
    // Ideally we don't fully reload window, just reset state, but keeping existing logic:
    window.location.reload();
  };

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <main className="flex min-h-screen flex-col items-center relative overflow-hidden font-sans transition-colors duration-500 -mt-16 pt-16"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Theme Toggle (Absolute Top Right) */}


      {/* Dynamic Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob bg-purple-600/50 dark:bg-emerald-900/40" />
      <div className="absolute top-0 -right-4 w-72 h-72 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000 bg-blue-600/50 dark:bg-indigo-900/40" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000 bg-pink-600/50 dark:bg-purple-900/40" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />

      {/* Note: Navbar component was removed from previous hierarchy as per design changes request potentially? */}
      {/* Keeping empty space if needed or just removing it since Layout has header now */}

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
                    {...getRootProps()}
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
                    <div className="flex flex-col items-center">
                      <input
                        {...getInputProps()}
                        onClick={(e) => {
                          // Prevent double-firing on mobile
                          e.stopPropagation();
                        }}
                      />
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
          />

        </div>
      </div>

      <Footer />
    </main>
  );
}
