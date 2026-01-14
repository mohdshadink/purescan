import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, RefreshCw } from "lucide-react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
    enableLiveDetection?: boolean;
}

interface DetectedObject {
    bbox: [number, number, number, number];
    class: string;
    score: number;
}

// Food items and context clues for detection
const FOOD_ITEMS = [
    'banana', 'apple', 'orange', 'broccoli', 'carrot', 'hot dog', 'sandwich', 'pizza',
    'bowl', 'cup', 'dining table', 'microwave', 'oven', 'sink', 'refrigerator'
];

export default function CameraModal({ isOpen, onClose, onCapture, enableLiveDetection = false }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const fallbackInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionError, setPermissionError] = useState<boolean>(false);
    const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCapturing, setIsCapturing] = useState<boolean>(false);
    const detectionFrameRef = useRef<number | null>(null);

    const streamRef = useRef<MediaStream | null>(null);

    // SAMPLE & HOLD: Track when we last ran detection
    const lastDetectionTimeRef = useRef<number>(0);
    // SAMPLE & HOLD: Store frozen predictions to display
    const frozenPredictionsRef = useRef<DetectedObject[]>([]);

    const startCamera = useCallback(async () => {
        try {
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
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    // Load model with FORCED 2-second minimum loading screen
    const loadModel = useCallback(async () => {
        try {
            setIsLoading(true);
            const loadStartTime = Date.now();

            // Initialize TensorFlow backend
            try {
                await tf.setBackend('webgl');
                await tf.ready();
                console.log('TensorFlow backend: webgl');
            } catch (backendErr) {
                console.warn('WebGL failed, using CPU:', backendErr);
                try {
                    await tf.setBackend('cpu');
                    await tf.ready();
                    console.log('TensorFlow backend: cpu');
                } catch (cpuErr) {
                    console.error('TensorFlow backend failed:', cpuErr);
                    throw new Error('Could not initialize TensorFlow backend');
                }
            }

            // Load model
            const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            setModel(loadedModel);

            // FORCE minimum 2000ms loading screen
            const loadTime = Date.now() - loadStartTime;
            const remainingTime = Math.max(0, 2000 - loadTime);

            setTimeout(() => {
                setIsLoading(false);
            }, remainingTime);
        } catch (err) {
            console.error("Failed to load model:", err);
            setIsLoading(false);
        }
    }, []);

    // SAMPLE & HOLD detection loop - updates only every 2 seconds
    const runDetection = useCallback(async () => {
        if (!model || !videoRef.current || !overlayCanvasRef.current || !stream) {
            return;
        }

        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx || video.readyState !== 4) {
            detectionFrameRef.current = requestAnimationFrame(runDetection);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
            const now = Date.now();

            // SAMPLE & HOLD: Only run detection every 2 seconds
            if (now - lastDetectionTimeRef.current > 2000) {
                const predictions = await model.detect(video, 20, 0.20);
                const foodDetections = predictions.filter((p: DetectedObject) =>
                    FOOD_ITEMS.includes(p.class.toLowerCase())
                );

                // Update frozen predictions
                frozenPredictionsRef.current = foodDetections;
                lastDetectionTimeRef.current = now;
            }

            // ALWAYS draw the frozen predictions (Sample & Hold)
            frozenPredictionsRef.current.forEach((prediction: DetectedObject) => {
                const [x, y, width, height] = prediction.bbox;
                const confidence = Math.round(prediction.score * 100);

                // FORCE GREEN color
                const color = '#00FF00';

                // SMART LABEL MAPPING
                let displayLabel: string;
                const className = prediction.class.toLowerCase();

                if (['sandwich', 'hot dog', 'pizza', 'donut', 'cake'].includes(className)) {
                    displayLabel = 'Detected Dish';
                } else if (className === 'potted plant') {
                    displayLabel = 'Fresh Produce';
                } else if (['carrot', 'broccoli', 'banana', 'apple', 'orange'].includes(className)) {
                    displayLabel = className.charAt(0).toUpperCase() + className.slice(1);
                } else {
                    displayLabel = 'Food Item';
                }

                // Draw bounding box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);

                // Draw label
                const label = `${displayLabel} (${confidence}%)`;
                ctx.font = 'bold 16px Arial';
                const textMetrics = ctx.measureText(label);
                const textHeight = 20;
                const padding = 8;

                ctx.fillStyle = color;
                ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding);

                ctx.fillStyle = '#000000';
                ctx.fillText(label, x + padding, y - padding);
            });

            // Show searching text if no detections
            if (frozenPredictionsRef.current.length === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = 'bold 20px Arial';
                const searchText = 'Searching for food...';
                const textWidth = ctx.measureText(searchText).width;
                ctx.fillText(searchText, (canvas.width - textWidth) / 2, 40);
            }
        } catch (err) {
            console.error("Detection error:", err);
        }

        // Continue loop every ~100ms (but detection only runs every 2s)
        setTimeout(() => {
            detectionFrameRef.current = requestAnimationFrame(runDetection);
        }, 100);
    }, [model, stream]);

    // Start detection when ready
    useEffect(() => {
        if (enableLiveDetection && model && stream && videoRef.current) {
            runDetection();
        }

        return () => {
            if (detectionFrameRef.current) {
                cancelAnimationFrame(detectionFrameRef.current);
                detectionFrameRef.current = null;
            }
        };
    }, [enableLiveDetection, model, stream, runDetection]);

    // Lifecycle management
    useEffect(() => {
        if (isOpen) {
            startCamera();

            if (enableLiveDetection) {
                if (!model) {
                    loadModel();
                } else {
                    // Model cached - still show 2s loading for consistency
                    setIsLoading(true);
                    setTimeout(() => setIsLoading(false), 2000);
                }
            }
        } else {
            stopCamera();
            setIsLoading(false);
            if (detectionFrameRef.current) {
                cancelAnimationFrame(detectionFrameRef.current);
                detectionFrameRef.current = null;
            }
        }

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (detectionFrameRef.current) {
                cancelAnimationFrame(detectionFrameRef.current);
            }
        };
    }, [isOpen, enableLiveDetection, startCamera, stopCamera, loadModel, model]);

    // Attach video stream
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
        }
    }, [stream]);

    // Capture with lag fix
    const handleCapture = () => {
        requestAnimationFrame(() => {
            setIsCapturing(true);

            if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const overlayCanvas = overlayCanvasRef.current;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const context = canvas.getContext('2d');
                if (context) {
                    if (enableLiveDetection && overlayCanvas) {
                        // Burn boxes into photo
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        context.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
                    } else {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    }

                    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                    fetch(imageDataUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                            onCapture(file);
                            onClose();
                            setIsCapturing(false);
                        })
                        .catch(err => {
                            console.error("Capture failed:", err);
                            setIsCapturing(false);
                        });
                }
            }
        });
    };

    const triggerFallback = () => fallbackInputRef.current?.click();

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
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover rounded-2xl"
                                    />

                                    {/* Detection Canvas */}
                                    {enableLiveDetection && (
                                        <canvas
                                            ref={overlayCanvasRef}
                                            className="absolute inset-0 w-full h-full pointer-events-none"
                                        />
                                    )}

                                    {/* FORCED LOADING OVERLAY (z-60) */}
                                    {isLoading && enableLiveDetection && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black z-[60]">
                                            <div className="text-white text-center">
                                                <RefreshCw className="h-16 w-16 animate-spin mx-auto mb-4 text-green-400" />
                                                <p className="text-xl font-bold mb-2">Initializing Smart Vision</p>
                                                <p className="text-sm opacity-60">Loading AI detection model...</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual Targeting Scope */}
                                    {enableLiveDetection && !isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="relative">
                                                <div className="w-64 h-64 border-2 border-white/40 rounded-xl relative">
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
                                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
                                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-6 h-0.5 bg-white/60"></div>
                                                        <div className="absolute w-0.5 h-6 bg-white/60"></div>
                                                    </div>
                                                </div>
                                                <p className="text-white text-sm font-semibold text-center mt-3 drop-shadow-lg">
                                                    Place Food / Meat Here
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
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
                                <>
                                    <button
                                        onClick={handleCapture}
                                        disabled={isCapturing}
                                        className="h-16 w-16 rounded-full border-4 border-white/20 flex items-center justify-center bg-white hover:scale-105 active:scale-95 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                    >
                                        {isCapturing ? (
                                            <RefreshCw className="h-8 w-8 animate-spin text-[#111]" />
                                        ) : (
                                            <div className="h-12 w-12 rounded-full border-2 border-[#111] bg-white group-hover:bg-blue-500 transition-colors" />
                                        )}
                                    </button>

                                    {enableLiveDetection && (
                                        <p className="text-white/40 text-xs text-center font-medium">
                                            Green Box: Auto-Detect | Center Scope: Manual Scan
                                        </p>
                                    )}
                                </>
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
