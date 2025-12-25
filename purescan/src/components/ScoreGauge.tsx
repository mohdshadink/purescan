"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
    score: number; // 0-100
    loading?: boolean;
}

export default function ScoreGauge({ score, loading }: ScoreGaugeProps) {
    // Determine color based on score
    const getColor = (val: number) => {
        if (val >= 80) return "#00ff9d"; // Good/Success
        if (val >= 50) return "#ffe600"; // Warning
        return "#ff0055"; // Danger
    };

    const color = getColor(score);

    // Calculate stroke dasharray for the gauge (semi-circle)
    // Circumference = 2 * pi * r
    // We want half circle, so max dash is pi * r
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const halfCircumference = circumference / 2;

    // Calculate offset.
    // Full offset (0 score) = halfCircumference
    // Empty offset (100 score) = 0
    const strokeDashoffset = halfCircumference - (loading ? 0 : (score / 100) * halfCircumference);

    return (
        <div className="relative w-64 h-32 flex justify-center overflow-hidden">
            {/* Background Arc */}
            <svg className="w-full h-full rotate-[180deg] overflow-visible" viewBox="0 0 200 100">
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100" // M startX startY A rx ry x-axis-rotation large-arc-flag sweep-flag endX endY
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="15"
                    strokeLinecap="round"
                />
                {/* Foreground Arc */}
                <motion.path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke={color}
                    strokeWidth="15"
                    strokeLinecap="round"
                    strokeDasharray={`${halfCircumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    initial={{ strokeDashoffset: halfCircumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "outBack" }}
                    style={{ filter: `drop-shadow(0 0 10px ${color})` }}
                />
            </svg>

            {/* Score Text */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 text-center">
                <motion.div
                    className="text-5xl font-bold font-mono"
                    style={{ color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {loading ? "--" : score}
                </motion.div>
                <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Health Score</div>
            </div>
        </div>
    );
}
