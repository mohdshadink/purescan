"use client";

import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveScan } from "@/app/actions";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("Missing NEXT_PUBLIC_GEMINI_API_KEY");
}

export interface AnalysisResult {
    title: string;
    score: number; // 0-10 scale
    status: 'Safe' | 'Moderate' | 'Hazardous' | 'Non-Food';
    findings: string[];
    recommendation: string;
}

export function useAnalysis() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const clearError = () => setError(null);

    const analyze = async (files: File[]) => {
        if (files.length === 0) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        const file = files[0];

        try {
            if (!API_KEY) {
                throw new Error("Gemini API key is not configured");
            }

            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                generationConfig: {
                    temperature: 0.1,
                    topK: 1,
                    topP: 0.1,
                }
            });

            // Convert any image format (AVIF, WebP, etc.) to JPEG for API compatibility
            const objectUrl = URL.createObjectURL(file);
            const image = new Image();
            image.src = objectUrl;

            try {
                await image.decode();
            } catch (e) {
                console.error("Image decode failed", e);
                throw new Error("Failed to process image. Please try a different format.");
            }

            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                throw new Error('Failed to get canvas context');
            }
            ctx.drawImage(image, 0, 0);
            const base64Data = canvas.toDataURL('image/jpeg', 0.8);
            URL.revokeObjectURL(objectUrl); // Clean up

            const imagePart = {
                inlineData: {
                    data: base64Data.split(",")[1],
                    mimeType: 'image/jpeg', // Always JPEG after conversion
                },
            };

            const prompt = `You are an expert food quality analyzer. Analyze the image and output strictly structured JSON ONLY. Do not use markdown formatting or code blocks.

Required JSON structure:
{
  "title": "Short Item Name (e.g. 'Pepperoni Pizza' or 'Caesar Salad')",
  "score": Integer 0-10,
  "status": "Safe / Moderate / Hazardous / Non-Food",
  "findings": ["Short observation 1", "Short observation 2", "Short observation 3"],
  "recommendation": "One short, helpful sentence."
}

Scoring Guide - FOCUS ON FRESHNESS AND EDIBILITY:
- Score the item primarily on FRESHNESS and EDIBILITY.
- If the food looks fresh, vibrant, and ready to eat (e.g., a fresh salad, a hot pizza, a clean fruit), give it a High Score (9-10).
- Only lower the score if the food looks: stale, rotten, moldy, burnt, or dangerously unhygienic.
- Do NOT penalize processed ingredients (like cheese, bread, bacon, or croutons) if they look fresh and safe to eat.

Examples:
- Fresh Caesar Salad: 10/10 (fresh, vibrant, safe)
- Fresh Burger: 9-10/10 (safe, fresh ingredients)
- Moldy Orange: 1/10 (spoiled, unsafe)

IMPORTANT: If the image is NOT food, set "score" to 0 and "status" to "Non-Food". Still identify what the item is in the title.`;

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            const cleanJson = text.replace(/```json|```/g, "").trim();
            const data = JSON.parse(cleanJson);

            // Ensure score is within 0-10 range
            const score = Math.max(0, Math.min(10, typeof data.score === 'number' ? data.score : 0));

            // Determine status based on score if not provided
            let status: AnalysisResult['status'] = data.status;
            if (!['Safe', 'Moderate', 'Hazardous', 'Non-Food'].includes(status)) {
                status = score === 0 ? 'Non-Food' : score >= 8 ? 'Safe' : score >= 5 ? 'Moderate' : 'Hazardous';
            }

            setResult({
                title: data.title || "Unknown Item",
                score: score,
                status: status,
                findings: Array.isArray(data.findings) ? data.findings : [],
                recommendation: data.recommendation || "Analysis complete."
            });

            // Save to database (Fire and forget - don't block UI)
            console.log("Saving scan result...");
            saveScan({
                foodName: data.title || "Scanned Item",
                score: score,
                analysis: data.recommendation || "Analysis complete.",
                imageUrl: base64Data
            }).then(res => console.log("Save complete:", res))
                .catch(e => console.error("Background save failed:", e));

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        analyze,
        isLoading,
        result,
        error,
        clearError
    };
}
