import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, RefreshCw } from "lucide-react";

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fallbackInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionError, setPermissionError] = useState<boolean>(false);

    // Use a ref to track the stream for cleanup to avoid dependency cycles
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        try {
            // Stop any existing stream first
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });

            streamRef.current = mediaStream;
            setStream(mediaStream);
            setPermissionError(false);
        } catch (err) {
            console.error("Camera access denied:", err);
            setPermissionError(true);
        }
    }, []); // Stable dependency

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, []); // Stable dependency

    // Primary lifecycle effect
    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            // Cleanup on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, startCamera, stopCamera]);

    // Video attachment effect
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            // Explicit play is often needed even with autoPlay
            videoRef.current.play().catch(console.error);
        }
    }, [stream]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Match canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                        onCapture(file);
                        onClose();
                    }
                }, 'image/jpeg', 0.95);
            }
        }
    };

    const triggerFallback = () => {
        fallbackInputRef.current?.click();
    };

    const handleFallbackCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onCapture(event.target.files[0]);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="absolute top-0 inset-x-0 p-4 flex justify-end items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                            <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                                <X className="h-5 w-5 text-white" />
                            </button>
                        </div>

                        {/* Video Feed */}
                        <div className="relative aspect-[3/4] md:aspect-square bg-black flex items-center justify-center rounded-2xl overflow-hidden">
                            {!permissionError && stream && (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover rounded-2xl"
                                />
                            )}

                            {permissionError && (
                                <div className="text-center p-8 text-white/50">
                                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Camera access unavailable.</p>
                                    <p className="text-xs mt-2">Please ensure you are using HTTPS or Localhost, or check browser permissions.</p>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="p-6 bg-[#111] flex flex-col items-center gap-4">
                            {!permissionError ? (
                                <button
                                    onClick={handleCapture}
                                    className="h-16 w-16 rounded-full border-4 border-white/20 flex items-center justify-center bg-white hover:scale-105 active:scale-95 transition-all group"
                                >
                                    <div className="h-12 w-12 rounded-full border-2 border-[#111] bg-white group-hover:bg-blue-500 transition-colors" />
                                </button>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <button onClick={startCamera} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors text-sm">
                                        <RefreshCw size={16} /> Retry Access
                                    </button>
                                    <button onClick={triggerFallback} className="text-[var(--color-primary)] text-sm hover:underline font-medium">
                                        Or upload from device/files
                                    </button>
                                </div>
                            )}
                        </div>

                        <canvas ref={canvasRef} className="hidden" />
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={fallbackInputRef}
                            onChange={handleFallbackCapture}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
