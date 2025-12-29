"use client";

import React, { useRef, useState } from "react";

interface HolographicCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    isActive?: boolean;
}

export default function HolographicCard({ children, className = "", isActive, ...props }: HolographicCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg)");
    const [sheenPosition, setSheenPosition] = useState("50% 50%");
    const [sheenOpacity, setSheenOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;

        // Tilt calculations
        const rotateY = x * 20; // Max 10 deg rotation
        const rotateX = -y * 20;

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
        setSheenPosition(`${50 + x * 100}% ${50 + y * 100}%`);
        setSheenOpacity(0.3 + Math.abs(x) * 0.5); // More visible at edges

        // Call original handler if exists
        props.onMouseMove?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
        setSheenOpacity(0);
        props.onMouseLeave?.(e);
    };

    return (
        <div
            ref={ref}
            {...props}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative transition-all duration-200 ease-out transform-gpu ${className} ${isActive ? 'scale-95' : ''}`}
            style={{
                transform,
                transformStyle: "preserve-3d",
            }}
        >
            {/* Content Layer */}
            <div className="relative z-10 w-full h-full" style={{ transform: "translateZ(20px)" }}>
                {children}
            </div>

            {/* Sheen Layer */}
            <div
                className="absolute inset-0 pointer-events-none z-20 rounded-3xl transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at ${sheenPosition}, rgba(255,255,255,0.4) 0%, transparent 60%)`,
                    opacity: sheenOpacity,
                    mixBlendMode: "overlay"
                }}
            />

            {/* Shadow Layer for depth */}
            <div
                className="absolute inset-2 z-0 rounded-3xl bg-black/20 blur-xl transition-all duration-300"
                style={{
                    transform: "translateZ(-20px) translateY(10px)",
                    opacity: transform.includes("rotateX(0deg)") ? 0 : 0.4
                }}
            />
        </div>
    );
}
