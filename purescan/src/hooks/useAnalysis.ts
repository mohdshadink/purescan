"use client";

import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveScan } from "@/app/actions";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("Missing NEXT_PUBLIC_GEMINI_API_KEY");
}

export interface AnalysisResult {
    score: number;
    status: 'Safe' | 'Moderate' | 'Hazardous';
    details: string;
    // Granular Metrics for Radar Chart
    metrics: {
        toxicity: number; // 0-100 (High is bad)
        processing: number; // 0-100 (High is processed)
        nutrition: number; // 0-100 (High is nutritious)
        freshness: number; // 0-100 (High is fresh)
    };
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
            // Deterministic Generation Config (Greedy Decoding)
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0.0,
                    topK: 1,
                    topP: 0.1,
                }
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

            const prompt = `
        Analyze this image of food/ingredient. 
        You are a Deterministic Nutritional Algo.
        
        Strictly output valid JSON only. No markdown formatting. No extra text.
        
        SCORING ALGORITHM (Start at 100):
        - High Sugar (Visible icing/syrup/candy): DEDUCT 30 points.
        - Ultra-Processed (Package/Artificial colors/Fast Food wrapper): DEDUCT 20 points.
        - Fried/Greasy (Visible oil/deep fried): DEDUCT 15 points.
        - Unknown Additives ( sauces/mixed sludge): DEDUCT 10 points.
        - BONUSES: Add +5 points ONLY if visible whole fruit/nuts/leaves are the MAIN component.
        
        *Ensure the final score reflects these deductions.*
        
        Structure:
        {
          "score": number (Calculated score based on rubric),
          "status": string ("Safe" > 70, "Moderate" 40-70, "Hazardous" < 40),
          "details": string (List the deductions made. E.g., "Started at 100. -15 for grease. -20 for processing. Final: 65."),
          "metrics": {
              "toxicity": number (0-100, perceived toxicity/harmful additives),
              "processing": number (0-100, level of industrial processing),
              "nutrition": number (0-100, nutrient density estimate),
              "freshness": number (0-100, visual freshness estimate)
          }
        }
        
        If the image is NOT food, return:
        {
          "score": 0,
          "status": "Hazardous",
          "details": "No food detected.",
          "metrics": { "toxicity": 100, "processing": 100, "nutrition": 0, "freshness": 0 }
        }`;

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            const cleanJson = text.replace(/```json|```/g, "").trim();
            const data = JSON.parse(cleanJson);

            setResult({
                score: typeof data.score === 'number' ? data.score : 0,
                status: data.status || "Unknown",
                details: data.details || "Analysis complete.",
                metrics: data.metrics || { toxicity: 0, processing: 0, nutrition: 0, freshness: 0 }
            });


            // Save to database (Fire and forget - don't block UI)
            console.log("Saving scan result...");
            saveScan({
                foodName: "Scanned Item",
                score: typeof data.score === 'number' ? data.score : 0,
                analysis: data.details || "Analysis complete.",
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
