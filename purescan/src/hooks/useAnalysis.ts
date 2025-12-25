"use client";

import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// hooks/useAnalysis.ts

// ... imports

// OLD (Delete this):
// const API_KEY = "AIzaSy..."; 

// NEW (Use this):
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error("Gemini API Key is missing! Check your .env.local file.");
}

// ... rest of your code

if (!API_KEY) {
    console.warn("Missing NEXT_PUBLIC_GEMINI_API_KEY in environment variables");
}

export function useAnalysis() {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<{ score: number; text: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [demoMode, setDemoMode] = useState(false);

    const analyzeImage = async (file: File) => {
        setAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            if (demoMode) {
                // Fake delay for effect
                await new Promise((resolve) => setTimeout(resolve, 3000));
                setResult({
                    score: 100,
                    text: "PERFECT QUALITY. No contaminants detected. Optimal freshness confirmed.",
                });
                return;
            }

            if (!API_KEY) {
                throw new Error("Gemini API key is not configured");
            }

            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", });

            // Convert file to base64
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const imagePart = {
                inlineData: {
                    data: base64Data.split(",")[1],
                    mimeType: file.type,
                },
            };

            const prompt = `Analyze this food image for quality and freshness. 
      Return ONLY a JSON object with this structure: { "score": number (0-100), "text": "short analysis string" }. 
      If it's not food, return score 0 and text "Not food detected".`;

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present
            const cleanJson = text.replace(/```json|```/g, "").trim();
            const data = JSON.parse(cleanJson);

            setResult({
                score: typeof data.score === 'number' ? data.score : 0,
                text: data.text || "Analysis failed",
            });

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    return {
        analyzeImage,
        analyzing,
        result,
        error,
        demoMode,
        toggleDemoMode: () => setDemoMode((prev) => !prev),
    };
}
