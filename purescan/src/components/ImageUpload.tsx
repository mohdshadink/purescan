"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, ImageIcon } from "lucide-react";

interface ImageUploadProps {
    onImageSelect: (file: File) => void;
    disabled?: boolean;
}

export default function ImageUpload({ onImageSelect, disabled }: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(file);
            onImageSelect(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div
            className={cn(
                "relative w-full aspect-square max-w-sm mx-auto rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden group cursor-pointer",
                isDragging ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(0,240,255,0.2)]" : "border-gray-700 hover:border-primary/50 hover:bg-white/5",
                disabled && "opacity-50 cursor-not-allowed",
                preview ? "border-solid border-primary" : ""
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                disabled={disabled}
            />

            {preview ? (
                <div className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                </div>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110", isDragging ? "bg-primary/20 text-primary" : "bg-gray-800 text-gray-400")}>
                        {isDragging ? <Upload className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                    </div>
                    <h3 className="text-lg font-bold mb-1">
                        {isDragging ? "Drop it here!" : "Scan Food Item"}
                    </h3>
                    <p className="text-sm text-gray-500">
                        Drag & drop or click to upload
                    </p>
                </div>
            )}
        </div>
    );
}
