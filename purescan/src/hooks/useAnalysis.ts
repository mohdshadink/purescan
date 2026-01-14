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

========================================
MODE DETECTION - ANALYZE THIS FIRST:
========================================
FIRST, determine the image type:
- Is it physical food (MODE A) - actual fruits, vegetables, meals, etc.?
- OR is it a text label/packaging (MODE B) - ingredient lists, nutrition facts, product labels?

========================================
[SCENARIO: IMAGES WITH DETECTED OBJECT BOXES]
========================================
IMPORTANT: Some images may contain green bounding boxes with labels (e.g., "apple 90%", "banana 75%").

These boxes are from a live detection system that highlights objects in the scene.

CRITICAL RULES for handling boxed images:
1. USE BOXES AS REFERENCE POINTS:
   - In your findings, reference the box locations to be specific.
   - DON'T say: "The apple is rotten"
   - DO say: "⚠️ The apple inside the top-left green box shows signs of decay"
   - DO say: "✅ The banana in the center green box appears perfectly ripe"

2. VERIFY AND CORRECT MISIDENTIFICATIONS:
   - The detection labels may be incorrect (limited AI vocabulary).
   - If you see a box labeled "carrot" but it's clearly a chili pepper, correct it:
     "⚠️ The object labeled 'carrot' in the bottom box is actually a rotting chili pepper with visible fungus."

3. LOCATION REFERENCES:
   - Use spatial language: "top-left box", "center box", "bottom-right box", "leftmost box"
   - If multiple boxes of the same item, distinguish them: "The apple in the upper box is fresh, but the apple in the lower box is bruised."

4. WHEN THERE ARE NO BOXES:
   - If no green boxes are present, proceed with normal analysis.
   - Your findings should still be specific but without referencing boxes.

========================================
[MODE A: VISUAL FOOD ANALYSIS]
========================================
Applies to: Physical food items (fruit, vegetables, meals, etc.)

Scoring Guide - FOCUS ON FRESHNESS AND EDIBILITY:
- Score the item primarily on FRESHNESS and EDIBILITY.
- If the food looks fresh, vibrant, and ready to eat (e.g., a fresh salad, a hot pizza, a clean fruit), give it a High Score (9-10).
- Only lower the score if the food looks: stale, rotten, moldy, burnt, or dangerously unhygienic.
- Do NOT penalize processed ingredients (like cheese, bread, bacon, or croutons) if they look fresh and safe to eat.

SCENARIO: GROUP OF ITEMS (e.g., Fruit Bowl, Pile of Veggies, Multiple Foods)
CRITICAL - If multiple items are visible:
1. SCAN ALL ITEMS INDIVIDUALLY - Examine each item in the group separately
2. SCORING STRATEGY:
   - Base the overall "Health Score" on the SAFEST / FRESHEST MAJORITY
   - If 90% of items are fresh but one apple has a bruise, give 8-9/10 (not 10/10)
   - If half the items are spoiled, give 4-6/10
3. FINDINGS FORMAT - Be specific about each item:
   - Use checkmarks and warnings: "✅ Majority of items are fresh and safe"
   - Flag problems: "⚠️ Warning: The red apple on the left appears bruised"
   - Be specific: "✅ Bananas are perfectly ripe" or "⚠️ The strawberries show signs of mold"
4. TITLE - For groups, use descriptive titles: "Mixed Fruit Bowl" or "Vegetable Assortment"

Examples:
- Fresh Caesar Salad: 10/10 (fresh, vibrant, safe)
- Fresh Burger: 9-10/10 (safe, fresh ingredients)
- Moldy Orange: 1/10 (spoiled, unsafe)
- Fruit Bowl (mostly fresh, one bruised apple): 8-9/10
  Findings: ["✅ Most fruits are fresh and ripe", "⚠️ One apple shows bruising on the left side", "✅ Bananas are at perfect ripeness"]

========================================
[MODE B: INGREDIENT LABEL ANALYSIS]
========================================
Applies to: Photos of text on packaging, ingredient lists, nutrition labels

CRITICAL: IGNORE visual freshness (it's just paper/plastic).

TASK: Read the ingredients and assess their quality.

CRITICAL FOCUS - You must actively look for and report on:
- Preservatives (e.g., Sodium Benzoate, Potassium Sorbate, Nitrates, BHA, BHT, TBHQ)
- Acids / Acidity Regulators (e.g., Phosphoric Acid, Citric Acid, Malic Acid, Lactic Acid)
- Artificial Additives (colors like Red 40, Yellow 5; emulsifiers like Polysorbate 80; sweeteners like Aspartame, Sucralose, Saccharin)

SCORING FOR LABELS - Score based on the 'cleanliness' of the ingredients:
- 10/10 = All recognizable natural foods (e.g., "Almonds, Sea Salt")
- 7-9/10 = Mostly natural with minimal preservatives (e.g., "Tomatoes, Water, Citric Acid")
- 4-6/10 = Several additives/preservatives (e.g., "High Fructose Corn Syrup, Sodium Benzoate, Artificial Colors")
- 1-3/10 = Mostly industrial chemicals/ultra-processed (e.g., "Multiple preservatives, acids, artificial sweeteners")

OUTPUT FORMAT FOR LABELS:
- 'title': Name of the product (e.g., "Soda Ingredient Label" or "Snack Bar Nutrition Info")
- 'findings': List specific chemical ingredients found and their health implications. Examples:
  * "⚠️ Phosphoric Acid found: Common in sodas, excessive intake linked to bone density issues."
  * "⚠️ Sodium Benzoate: A preservative that may form benzene (carcinogen) when combined with Vitamin C."
  * "ℹ️ Citric Acid: A common preservative derived from fruit, generally safe in moderation."
  * "⚠️ Artificial Color Red 40: Synthetic dye linked to hyperactivity in sensitive children."
  * "⚠️ High Fructose Corn Syrup: Ultra-processed sweetener associated with metabolic issues."
- 'recommendation': Summarize the overall processed nature (e.g., "Ultra-processed snack with multiple preservatives and artificial acids - consume sparingly." or "Clean ingredient list with only natural preservatives.")

========================================
GENERAL RULES (Both Modes):
========================================
IMPORTANT: If the image is NOT food-related at all, set "score" to 0 and "status" to "Non-Food". Still identify what the item is in the title.`;

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
