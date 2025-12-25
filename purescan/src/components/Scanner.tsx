"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScannerProps {
    scanning: boolean;
    className?: string;
}

export default function Scanner({ scanning, className }: ScannerProps) {
    if (!scanning) return null;

    return (
        <div className={cn("absolute inset-0 z-50 overflow-hidden rounded-xl pointer-events-none", className)}>
            {/* Grid Overlay */}
            <div
                className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"
                style={{ opacity: 0.5 }}
            />

            {/* Moving Laser */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_20px_#00f0ff] z-10"
                animate={{
                    top: ["0%", "100%", "0%"],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            {/* Radar Sweep Effect */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(0,240,255,0.1)] to-transparent"
                animate={{
                    top: ["-100%", "100%"],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            {/* Corner Brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary" />

            {/* Access Text */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-primary font-mono text-sm tracking-[0.2em] animate-pulse">
                ANALYZING BIOLOGICAL SIGNATURE...
            </div>
        </div>
    );
}
