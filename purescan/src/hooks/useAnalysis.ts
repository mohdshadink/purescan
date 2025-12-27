"use client";

import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("Missing NEXT_PUBLIC_GEMINI_API_KEY");
}

type AnalysisResult = {
    score: number;
    status: string;
    details: string;
};

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
            // User explicitly requested gemini-2.5-flash with low temperature for consistency
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { temperature: 0.1 }
            });

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

            const prompt = `Role: You are a Bio-Organic Food Safety Expert. 
            Task: Analyze the provided image.
            1. Determine if the image contains food or an ingredients list.
            2. If it is NOT food (e.g., a screenshot of an app, a car, a person, or a blank photo), return exactly this JSON: { "score": -1, "status": "Invalid", "details": "No food detected. Please upload a clear photo of food or an ingredients label." }
            3. If it IS food, perform the quality analysis as usual and return: { "score": number (0-100), "status": string, "details": string }.
            Return ONLY valid JSON.`;

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            const cleanJson = text.replace(/```json|```/g, "").trim();
            const data = JSON.parse(cleanJson);

            setResult({
                score: typeof data.score === 'number' ? data.score : 0,
                status: data.status || "Unknown",
                details: data.details || "Analysis complete.",
            });

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
