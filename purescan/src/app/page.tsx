"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { analyze, isLoading, error, result, clearError } = useAnalysis();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (acceptedFiles.length > 0) {
        setPreviewUrl(URL.createObjectURL(acceptedFiles[0]));
        clearError();
        analyze(acceptedFiles);
      }
    },
    [analyze, clearError, previewUrl]
  );

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

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#050505] text-white relative overflow-hidden font-sans selection:bg-green-500/30">

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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-widest text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.1)]">
            <Zap size={12} className="fill-current" /> Bio-Organic Analysis v2.5
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight pb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-blue-500 drop-shadow-lg">
              PureScan AI
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-light">
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
                <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/50">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  {isLoading && (
                    <div className="absolute inset-0 bg-green-500/10 z-20">
                      <div className="w-full h-0.5 bg-green-400 shadow-[0_0_20px_#4ade80] absolute top-0 animate-[scan_2s_italic_infinite]" />
                    </div>
                  )}
                </div>
                {/* Reflection/Glow underneath */}
                <div className="absolute -inset-4 bg-gradient-to-t from-green-500/20 to-transparent blur-xl -z-10 rounded-full opacity-60" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Interaction Zone */}
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
              {/* UPLOAD STATE */}
              {!result && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  {...getRootProps()}
                  className={`
                        relative flex flex-col items-center justify-center text-center p-12 rounded-[2rem] cursor-pointer transition-all duration-300
                        border-2 border-dashed backdrop-blur-md shadow-2xl
                        ${isDragActive
                      ? "border-green-400 bg-green-500/10 shadow-[0_0_40px_rgba(74,222,128,0.3)]"
                      : "border-white/10 bg-white/5 hover:border-green-400/50 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(74,222,128,0.1)]"
                    }
                      `}
                >
                  <input {...getInputProps()} />
                  <div className={`p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20 mb-6 shadow-inner border border-white/5 ${isDragActive ? 'animate-bounce' : ''}`}>
                    <UploadCloud className={`h-12 w-12 ${isDragActive ? 'text-green-400' : 'text-gray-300'}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Tap to Analyze</h3>
                  <p className="text-gray-400 font-medium">Drag & drop or click to upload specimen</p>
                </motion.div>
              )}

              {/* LOADING STATE */}
              {isLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-12 bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl"
                >
                  <LoadingSpinner />
                  <div className="mt-8 flex flex-col items-center gap-2">
                    <p className="text-green-400 font-bold tracking-widest animate-pulse">ANALYZING SPECIMEN</p>
                    <p className="text-xs text-green-500/50 font-mono">Running spectrographic algorithms...</p>
                  </div>
                </motion.div>
              )}

              {/* RESULT STATE */}
              {result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden"
                >
                  {/* Background Gradient for result card */}
                  <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${result.score >= 70 ? 'from-green-500/20' : result.score >= 30 ? 'from-yellow-500/20' : 'from-red-500/20'} to-transparent blur-3xl -z-10`} />

                  {/* Result Header */}
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h2 className={`text-4xl md:text-5xl font-black flex items-center gap-4 ${result.score >= 70 ? 'text-green-400' : result.score >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {result.score >= 70 && <CheckCircle className="h-10 w-10" />}
                        {result.score >= 30 && result.score < 70 && <AlertTriangle className="h-10 w-10" />}
                        {result.score < 30 && <XCircle className="h-10 w-10" />}
                        {result.status}
                      </h2>
                      <p className="text-white/60 text-sm mt-2 font-medium tracking-wide">Analysis Complete</p>
                    </div>
                    <div className="text-right bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                      <span className="block text-4xl font-mono font-bold text-white">{result.score}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">Quality Score</span>
                    </div>
                  </div>

                  {/* Range Bar */}
                  <div className="mb-10">
                    <div className="h-6 w-full bg-black/50 rounded-full overflow-hidden border border-white/10 p-1.5 backdrop-blur-sm">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.score}%` }}
                        transition={{ duration: 1.2, ease: "circOut" }}
                        className={`h-full rounded-full shadow-[0_0_20px_currentColor] ${result.score >= 70 ? 'bg-green-500 text-green-500' : result.score >= 30 ? 'bg-yellow-500 text-yellow-500' : 'bg-red-500 text-red-500'}`}
                      />
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] uppercase text-gray-500 font-bold tracking-widest px-2">
                      <span className="text-red-500/60">Hazardous</span>
                      <span className="text-yellow-500/60">Moderate</span>
                      <span className="text-green-500/60">Premium</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5 mb-8 hover:bg-white/10 transition-colors">
                    <p className="text-gray-200 leading-relaxed text-base font-light">
                      {result.details}
                    </p>
                  </div>

                  <button
                    onClick={resetScan}
                    className="w-full py-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-white/5 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <RefreshCw className="h-5 w-5" /> New Analysis
                  </button>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && <ErrorMessage message={error} />}

        </div>
      </div>

      <Footer />
    </main>
  );
}
