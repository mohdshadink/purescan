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
    enableLiveDetection?: boolean; // NEW: Enable real-time object detection
}

// Type for COCO-SSD detection predictions
interface DetectedObject {
    bbox: [number, number, number, number];
    class: string;
    score: number;
}

// Food items we want to detect (expanded to include containers)
// NOTE: COCO-SSD model has a limited vocabulary of ~80 classes.
// It supports: banana, apple, orange, broccoli, carrot, bowl, cup, potted plant
// It does NOT support: watermelon, grapes, strawberry, etc.
// For complete freshness analysis, users should capture and send to Gemini API.
const FOOD_ITEMS = ['banana', 'apple', 'orange', 'broccoli', 'carrot', 'potted plant', 'bowl', 'cup'];

export default function CameraModal({ isOpen, onClose, onCapture, enableLiveDetection = false }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const fallbackInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionError, setPermissionError] = useState<boolean>(false);
    const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
    const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
    const [isCapturing, setIsCapturing] = useState<boolean>(false); // NEW: State for capture UI feedback
    const detectionFrameRef = useRef<number | null>(null);

    // Use a ref to track the stream for cleanup to avoid dependency cycles
    const streamRef = useRef<MediaStream | null>(null);

    // NEW: Ref to store last predictions for persistence (prevent flickering)
    const lastPredictionsRef = useRef<{ predictions: DetectedObject[], timestamp: number }>({ predictions: [], timestamp: 0 });

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

    // Load COCO-SSD model
    const loadModel = useCallback(async () => {
        try {
            setIsModelLoading(true);

            // Initialize TensorFlow backend before loading model
            try {
                await tf.setBackend('webgl');
                await tf.ready();
                console.log('TensorFlow backend initialized: webgl');
            } catch (backendErr) {
                console.warn('WebGL backend failed, falling back to CPU:', backendErr);
                try {
                    await tf.setBackend('cpu');
                    await tf.ready();
                    console.log('TensorFlow backend initialized: cpu');
                } catch (cpuErr) {
                    console.error('Failed to initialize any TensorFlow backend:', cpuErr);
                    throw new Error('Could not initialize TensorFlow backend');
                }
            }

            // Use lite model for better mobile performance
            const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            setModel(loadedModel);
            setIsModelLoading(false);
        } catch (err) {
            console.error("Failed to load COCO-SSD model:", err);
            setIsModelLoading(false);
        }
    }, []);

    // Detection loop with persistence logic
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

        // Match canvas size to video display size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
            // Run detection with low confidence threshold (0.20 = 20%) for easier detection
            // Parameters: detect(video, maxDetections, scoreThreshold)
            const currentPredictions = await model.detect(video, 20, 0.20);

            // Filter for food items
            const foodDetections = currentPredictions.filter((prediction: DetectedObject) =>
                FOOD_ITEMS.includes(prediction.class.toLowerCase())
            );

            // PERSISTENCE LOGIC: Update ref if we have detections, otherwise use stored predictions
            let detectionsToRender: DetectedObject[];

            if (foodDetections.length > 0) {
                // NEW detections found - update ref and use them
                lastPredictionsRef.current = {
                    predictions: foodDetections,
                    timestamp: Date.now()
                };
                detectionsToRender = foodDetections;
            } else {
                // NO detections - check if we should persist old ones
                const timeSinceLastDetection = Date.now() - lastPredictionsRef.current.timestamp;

                if (timeSinceLastDetection < 2000) {
                    // Less than 2 seconds - keep showing stored predictions
                    detectionsToRender = lastPredictionsRef.current.predictions;
                } else {
                    // More than 2 seconds - clear boxes
                    detectionsToRender = [];
                }
            }

            // Draw bounding boxes for detectionsToRender
            detectionsToRender.forEach((prediction: DetectedObject, index: number) => {
                const [x, y, width, height] = prediction.bbox;
                const confidence = Math.round(prediction.score * 100);

                // Color palette for different items
                const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
                const color = colors[index % colors.length];

                // Draw bounding box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);

                // Draw label background
                const label = `${prediction.class} (${confidence}%)`;
                ctx.font = 'bold 16px Arial';
                const textMetrics = ctx.measureText(label);
                const textHeight = 20;
                const padding = 8;

                ctx.fillStyle = color;
                ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding);

                // Draw label text
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, x + padding, y - padding);
            });

            // Show "Searching..." if no detections to render
            if (detectionsToRender.length === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = 'bold 20px Arial';
                const searchText = 'Searching for food...';
                const textWidth = ctx.measureText(searchText).width;
                ctx.fillText(searchText, (canvas.width - textWidth) / 2, 40);
            }
        } catch (err) {
            console.error("Detection error:", err);
        }

        // Continue loop - run detection every ~100ms
        setTimeout(() => {
            detectionFrameRef.current = requestAnimationFrame(runDetection);
        }, 100);
    }, [model, stream]);

    // Start detection loop when model and stream are ready (only if live detection is enabled)
    useEffect(() => {
        if (enableLiveDetection && model && stream && videoRef.current) {
            runDetection();
        }

        return () => {
            // Cleanup detection loop
            if (detectionFrameRef.current) {
                cancelAnimationFrame(detectionFrameRef.current);
                detectionFrameRef.current = null;
            }
        };
    }, [enableLiveDetection, model, stream, runDetection]);

    // Primary lifecycle effect
    useEffect(() => {
        if (isOpen) {
            startCamera();
            // Only load TensorFlow model if live detection is enabled
            if (enableLiveDetection && !model) {
                loadModel();
            }
        } else {
            stopCamera();
            // Stop detection loop
            if (detectionFrameRef.current) {
                cancelAnimationFrame(detectionFrameRef.current);
                detectionFrameRef.current = null;
            }
        }
        return () => {
            // Cleanup on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (detectionFrameRef.current) {
                cancelAnimationFrame(detectionFrameRef.current);
            }
        };
    }, [isOpen, enableLiveDetection, startCamera, stopCamera, loadModel, model]);

    // Video attachment effect
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            // Explicit play is often needed even with autoPlay
            videoRef.current.play().catch(console.error);
        }
    }, [stream]);

    const handleCapture = () => {
        // Use requestAnimationFrame to ensure UI updates first (isCapturing state)
        requestAnimationFrame(() => {
            setIsCapturing(true);

            if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const overlayCanvas = overlayCanvasRef.current;

                // Match canvas size to video size
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const context = canvas.getContext('2d');
                if (context) {
                    if (enableLiveDetection && overlayCanvas) {
                        // LIVE DETECTION MODE: Burn boxes into photo
                        // Draw video frame first
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        // Then draw the overlay canvas (with bounding boxes) on top
                        context.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
                    } else {
                        // REGULAR MODE: Clean video frame only
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    }

                    // Capture with 0.8 quality for speed (as requested)
                    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                    // Convert data URL to Blob
                    fetch(imageDataUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                            onCapture(file);
                            onClose();
                            setIsCapturing(false);
                        })
                        .catch(err => {
                            console.error("Failed to capture image:", err);
                            setIsCapturing(false);
                        });
                }
            }
        });
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
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover rounded-2xl"
                                    />
                                    {/* AR Overlay Canvas for Detection Boxes - Only in Live Mode */}
                                    {enableLiveDetection && (
                                        <canvas
                                            ref={overlayCanvasRef}
                                            className="absolute inset-0 w-full h-full pointer-events-none"
                                        />
                                    )}
                                    {/* Model Loading Indicator - Only in Live Mode */}
                                    {enableLiveDetection && isModelLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <div className="text-white text-center">
                                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                                                <p className="text-sm">Loading AI Model...</p>
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

                                    {/* Explanatory Label - Only in Live Mode */}
                                    {enableLiveDetection && (
                                        <p className="text-white/40 text-xs text-center font-medium">
                                            Live Targeting: Detecting basic shapes...
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
