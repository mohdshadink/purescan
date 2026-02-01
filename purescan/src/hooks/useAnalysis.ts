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

2. **CRITICAL: VERIFY AND CORRECT MISIDENTIFICATIONS**
   ⚠️ **THE GREEN BOX LABELS COME FROM A 'LOW-IQ' MODEL AND ARE OFTEN WRONG**
   - The detection model has a LIMITED vocabulary and FREQUENTLY misidentifies items.
   - Common mistakes: Calling a Papaya a "Banana", calling a Chili Pepper a "Carrot", calling a Mango an "Orange".
   - **YOU ARE THE JUDGE, NOT THE READER. YOU MUST VISUALLY VERIFY EVERY SINGLE BOX.**
   - **IF THE LABEL IS WRONG, YOU MUST EXPLICITLY CORRECT IT IN YOUR FINDINGS.**
   
   Examples of REQUIRED corrections:
   - ❌ "The box labeled 'Banana' is actually a fresh Papaya. It appears ripe and safe to eat."
   - ❌ "The object labeled 'Carrot' in the bottom box is actually a rotting Chili Pepper with visible mold."
   - ❌ "The box says 'Orange' but this is clearly a Mango. The flesh is yellow and fibrous, typical of mango."
   
   **DO NOT simply accept the label. ALWAYS verify visually and correct if wrong.**

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

========================================
📍 THE "QUADRANT SCAN" PROTOCOL (MANDATORY)
========================================
You are a FORENSIC FOOD ANALYST. You MUST scan the image in a GRID PATTERN.

**CRITICAL REQUIREMENT:**
You are REQUIRED to identify and report on items in ALL FOUR QUADRANTS if present:
- [Top-Left]
- [Top-Right]
- [Bottom-Left]
- [Bottom-Right]

**DO NOT SKIP AN ITEM** just because other parts of the image are disgusting.

**EVALUATE EACH QUADRANT IN ISOLATION:**
- Even if Bottom-Right has moldy food, you MUST still analyze and report on the Top-Left item
- Each quadrant gets its own assessment independent of others
- List ALL visible items with their quadrant locations

**QUADRANT SCAN CHECKLIST:**
Before finalizing your response, ask yourself:
✓ Did I check Top-Left?
✓ Did I check Top-Right?
✓ Did I check Bottom-Left?
✓ Did I check Bottom-Right?
✓ Did I report on EVERY visible food item?

If you answer "NO" to any of these, GO BACK and complete the scan.

========================================
🔬 TEXTURE ANALYSIS - THE "BIRYANI RULE"
========================================
Distinguish between SPICES/CHAR vs. MOLD based on TEXTURE:

**SAFE - Spices/Cooking Marks:**
- IF (Dark spots are FLAT, CRISPY, or INTEGRATED into the sauce/gravy)
- IF (Dark spots look DRY and part of the cooking process)
- IF (Dark spots are BLACK/BROWN and look like charred skin or grill marks)
→ IT IS SPICE/COOKING. Mark as "Fresh/Cooked" or "Safe"

**HAZARDOUS - Mold/Spoilage:**
- IF (Dark/White spots are FUZZY, RAISED, or 3D)
- IF (Spots are SLIMY, WET, or have visible moisture)
- IF (White/Green/Gray patches that look like cotton or fur)
→ IT IS MOLD. Mark as "Hazardous" or "Spoiling"

**SPECIFIC CHECK FOR BIRYANI/COOKED RICE DISHES:**
- The Chicken Biryani in Top-Left likely has:
  * Dark spices (Cloves, Cardamom, Black Pepper visible as dark dots)
  * Charred chicken skin (brown/black crispy areas)
  * Turmeric/Masala stains (yellow/orange/brown coloring)
- **DO NOT flag these as rot unless you see WHITE FUZZ or SLIME**

========================================
✅ THE "MIXED REPORT" FORMAT (MANDATORY)
========================================
Your findings output MUST allow for a MIX of Safe and Unsafe items.

**REQUIRED FORMAT:**
Each item gets its own line with:
[Item Name] ([Quadrant]): [✅ Status] - [Detailed observation]

EXAMPLE OUTPUT STRUCTURE:
[
  "✅ Chicken Biryani (Top-Left): FRESH - Well-cooked meat with visible charring (normal cooking effect). Dark spices visible (cloves, cardamom). No mold or slime detected.",
  "❌ Chicken Platter (Top-Right): HAZARDOUS - Covered in blue-green fuzzy mold. Unsafe to consume.",
  "❌ Raw Meat (Bottom-Center): HAZARDOUS - Visible discoloration and slime. Signs of spoilage.",
  "✅ Rice (Bottom-Left): FRESH - Clean white grains, no mold visible."
]

**SCORING BALANCE:**
- Total Health Score: Low (2-4/10) due to presence of moldy items
- Status: "Hazardous" (due to worst item rule)
- BUT Findings List: Accurately gives ✅ to healthy items and ❌ to spoiled items

GOAL: The user MUST see "Chicken Biryani (Top-Left): ✅ FRESH" even if the overall score is 2/10.

Scoring Guide - FOCUS ON FRESHNESS AND EDIBILITY:
- Score the item primarily on FRESHNESS and EDIBILITY.
- If the food looks fresh, vibrant, and ready to eat (e.g., a fresh salad, a hot pizza, a clean fruit), give it a High Score (9-10).
- Only lower the score if the food looks: stale, rotten, moldy, burnt, or dangerously unhygienic.
- Do NOT penalize processed ingredients (like cheese, bread, bacon, or croutons) if they look fresh and safe to eat.

========================================
🚨 ZERO TOLERANCE SAFETY RULES (CRITICAL)
========================================
⚠️ THE "ONE BAD APPLE" RULE - MANDATORY ENFORCEMENT:

IF ANY SINGLE ITEM in the image shows signs of ROT, MOLD, or SPOILAGE:
1. **MAXIMUM SCORE = 4/10** (HARD LIMIT - NO EXCEPTIONS)
2. **STATUS = "Hazardous"** (Set immediately)
3. **FIRST FINDING MUST BE A SPATIAL WARNING** (See format below)

RATIONALE: One rotten item indicates cross-contamination risk. It doesn't matter if 9 other items are perfect.

AGGRESSIVE SPOILAGE DETECTION - YOU MUST ACTIVELY SCAN FOR:
- **Discoloration**: Brown/Black spots, Dark patches, Slimy surfaces
- **Mold**: Fuzzy white/green/blue patches, Powdery residue
- **Shriveling**: Wrinkled skin, Collapsed structure, Soft spots
- **Leafy Greens/Cabbage**: Dark/slimy/wilted leaves = ROTTEN (not "aging" or "slightly old")

DO NOT USE POLITE LANGUAGE FOR ROT:
- ❌ WRONG: "The cabbage appears to be past its prime"
- ✅ CORRECT: "ROTTEN Cabbage detected"
- ❌ WRONG: "Some minor discoloration visible"
- ✅ CORRECT: "Mold detected on strawberries"

SPATIAL WARNING FORMAT (The "Finger Point"):
When rot is detected in a group, your FIRST FINDING must be:
- "🚨 WARNING: [Item Name] ([Position]) is ROTTEN/MOLDY. Surrounding items may be contaminated."
- EXAMPLE: "🚨 WARNING: The Cabbage (Bottom-Left) is ROTTEN with dark, slimy leaves. The surrounding vegetables may be contaminated."

SCENARIO: GROUP OF ITEMS (e.g., Fruit Bowl, Pile of Veggies, Multiple Foods)
========================================
📋 THE "FULL ROLL CALL" RULE (MANDATORY)
========================================
COMPLETE INVENTORY REQUIREMENT:

Do NOT just look for problems. You MUST catalog ALL distinct food items visible in the frame.

FOR EACH ITEM GROUP, YOU MUST REPORT:
- **[Name] ([Location]): [CONDITION]** - [Detailed observation]

EXAMPLE FORMAT:
- "Carrots (Top-Right): HEALTHY - Firm texture, bright orange color, no visible decay."
- "Eggplant (Right-Side): HEALTHY - Shiny skin, firm structure, vibrant purple color."
- "Cauliflower (Center): ROTTEN - Significant brown spotting and discoloration detected."

MIXED CONDITION LOGIC:
If a photo contains BOTH fresh and rotten items, you must EXPLICITLY DIFFERENTIATE them.
- ❌ WRONG: "The vegetables are mixed quality"
- ✅ CORRECT: "The Carrots (Top-Right) are HEALTHY and fresh, BUT the Cauliflower (Center) is ROTTEN with brown spotting."

SCORING WITH COMPLETE INVENTORY:
1. Calculate the Health Score based on the WORST item found
2. If ANY item is rotten (mold, slime, heavy bruising), Total Score = 4/10 or lower
3. HOWEVER, in your 'Findings' list, you MUST still acknowledge healthy items with ✅ checkmarks

EXAMPLE FINDINGS for mixed cart:
[
  "🚨 WARNING: Cauliflower (Center) is ROTTEN with brown spots. Risk of contamination.",
  "✅ Carrots (Top-Right) are HEALTHY - Firm and bright orange.",
  "✅ Eggplant (Right-Side) is HEALTHY - Shiny skin, no blemishes.",
  "⚠️ Onion (Left) shows minor outer layer damage but appears salvageable."
]

HALLUCINATION CHECK (CRITICAL):
**VERIFY YOUR LABELS CAREFULLY:**
- Do NOT call a Carrot a "Banana"
- Do NOT call an Onion a "Tomato"
- Do NOT call a Cauliflower a "Cabbage"
- Look closely at texture, shape, and color before labeling
- If uncertain about an item's identity, describe it generically: "White vegetable (Center)"

GOAL: The result should be a comprehensive list containing EVERY visible food item with individual health assessments.

========================================
🚨 "GUILT BY ASSOCIATION" PROTOCOL (CRITICAL)
========================================
PARANOID MODE TRIGGER:

CRITICAL: If you detect ANY rotten item (with visible mold, slime, or heavy decay), you MUST immediately switch to 'PARANOID MODE' for ALL remaining items in the image.

IN PARANOID MODE:
- Minor blemishes (small bruises, dry spots, slight discoloration) that are USUALLY acceptable must now be flagged as '⚠️ WARNING' or 'AT RISK'
- Do NOT give items the benefit of the doubt
- REASONING: If one item is rotting, fungal spores are likely spreading to nearby items. Cross-contamination is probable.

EXAMPLE:
- Normal Mode: "Small bruise on apple: Still safe to eat" → Score 8/10
- Paranoid Mode (rot detected elsewhere): "Small bruise on apple: ⚠️ AT RISK - May be early contamination" → Score 4/10

========================================
🔍 SPECIFIC SYMPTOM CHECKLIST (MANDATORY)
========================================
Scan EVERY item against these specific failure points to prevent missing spoilage:

**PINEAPPLE:**
- ❌ Soft/dark "eyes" (hexagonal segments)
- ❌ Dry, brown, or wilted leaves at crown
- ❌ Sunken or soft spots on skin
- ❌ Fermented/alcoholic smell (if mentioned or visible liquid)
- IF ANY visible → Mark as "SPOILING" or "AT RISK", NOT "Fresh"

**GRAPES:**
- ❌ Shriveled/wrinkled skin
- ❌ Loose or detached stems
- ❌ White fuzzy mold on surface
- ❌ Brown/mushy spots
- IF ANY visible → Mark as "SPOILING" or "AT RISK"

**LEAFY GREENS (Lettuce, Cabbage, Spinach):**
- ❌ Slimy/wet texture on leaves
- ❌ "Melting" or translucent edges
- ❌ Dark brown/black spots
- ❌ Wilted/collapsed structure
- IF ANY visible → Mark as "ROTTEN" immediately

**BERRIES (Strawberries, Blueberries, Raspberries):**
- ❌ White/gray fuzzy mold
- ❌ Mushy/collapsed berries
- ❌ Liquid pooling in container
- IF ANY visible → Mark as "MOLDY" immediately

**BANANAS:**
- ❌ Extensive black spotting (covering >50% of skin)
- ❌ Split/cracked skin with exposed fruit
- ❌ Fruit flies visible (if mentioned)
- Minor brown spots = OK (natural ripening)
- IF heavily spotted → Mark as "OVERRIPE - Approaching spoilage"

GOAL: Do not miss subtle signs of spoilage. Better to flag falsely than to miss contamination.

========================================
🍛 COOKED FOOD NUANCE (CRITICAL)
========================================
EXEMPTION FOR COOKED DISHES:

When analyzing COOKED MEAT, BIRYANI, GRILLED ITEMS, or any PREPARED DISHES:

**DO NOT CONFUSE COOKING WITH SPOILAGE:**
- ✅ **Maillard Reaction** (browning/charring from cooking) ≠ ROT
- ✅ **Dark Spices** (Cloves, Black Pepper, Masala, Turmeric stains) ≠ Discoloration
- ✅ **Crispy/Dry Dark Spots** = LIKELY cooking marks (Safe)
- ❌ **Fuzzy White/Green Growth** = MOLD (Hazardous)
- ❌ **Slimy/Wet Texture** = SPOILAGE (Hazardous)

**SPOILAGE INDICATORS FOR COOKED FOOD:**
1. White/Green/Gray fuzzy mold on surface
2. Slimy or sticky texture (not from oil/sauce)
3. Visible liquid separation or curdling
4. Dried-out, cracked appearance (days old)

**IF NONE OF THE ABOVE VISIBLE:**
- Mark the dish as "FRESH" or "Safe to eat"
- Do NOT downgrade score for normal cooking effects

EXAMPLE CORRECT ANALYSIS:
- "Chicken Biryani (Top-Left): FRESH - Meat appears well-cooked with visible spices and slight charring from cooking. No signs of fungal growth or slime."
- "Grilled Chicken (Center): SAFE - Dark grill marks visible (normal cooking). Texture appears dry and crispy, not slimy."

========================================
🔬 THE "ISOLATION" CHECK (MANDATORY)
========================================
JUDGE EACH DISH INDEPENDENTLY:

Even if Paranoid Mode is triggered by a rotten item elsewhere in the frame, you MUST judge each dish on its OWN MERITS.

**RULE:**
- If the Biryani on the left shows NO fuzz, slime, or mold, you MUST mark it "FRESH"
- If a fresh dish is NEXT TO a moldy item, add a caution note but keep the fresh rating

**FORMAT FOR PROXIMITY WARNING:**
- "Biryani (Left): FRESH - Well-cooked with visible spices. No mold detected. ⚠️ CAUTION: Proximity to spoiled item (right) poses cross-contamination risk. Store separately."

**DO NOT:**
- Automatically downgrade a fresh cooked dish just because raw produce nearby is rotten
- The overall Safety Score will still be low (due to worst item rule), but individual assessments must be accurate

GOAL: Do not miss subtle signs of spoilage. Better to flag falsely than to miss contamination.

CRITICAL - If multiple items are visible:
1. SCAN ALL ITEMS INDIVIDUALLY - Examine each item in the group separately
2. **SCORING STRATEGY WITH ZERO TOLERANCE**:
   - **FIRST CHECK**: Scan for ANY rot, mold, or spoilage (see rules above)
   - **IF ROT FOUND**: Score = 3-4/10 MAX, Status = "Hazardous", First finding = Spatial warning
   - **IF NO ROT**: Base score on overall freshness
     * All fresh = 9-10/10
     * Minor bruising/aging = 7-8/10
     * Multiple items with issues = 5-6/10
3. **FINDINGS FORMAT** - Be specific about each item:
   - If rot detected: Start with spatial warning (see format above)
   - Use checkmarks and warnings: "✅ Majority of items are fresh and safe"
   - Flag problems: "⚠️ Warning: The red apple on the left appears bruised"
   - Be specific: "✅ Bananas are perfectly ripe" or "🚨 The strawberries show MOLD"
4. **TITLE** - For groups, use descriptive titles: "Mixed Fruit Bowl" or "Vegetable Assortment"

Examples:
- Fresh Caesar Salad: 10/10 (fresh, vibrant, safe)
- Fresh Burger: 9-10/10 (safe, fresh ingredients)
- Moldy Orange: 1/10 (spoiled, unsafe)
- Fruit Bowl (mostly fresh, one bruised apple): 8-9/10
  Findings: ["✅ Most fruits are fresh and ripe", "⚠️ One apple shows bruising on the left side", "✅ Bananas are at perfect ripeness"]

========================================
🔬 FORENSIC DECONSTRUCTION MODE
========================================
DETECTION STRATEGY - HANDLING COMPLEX GROUPS AND MIXED DISHES:

When analyzing multiple food items (whether grouped, piled, plated together, or mixed in a cooked dish), you MUST apply FORENSIC DECONSTRUCTION:

1. **SPATIAL TAGGING (MANDATORY for all multi-item scenes)**
   - Do not just list items generically. YOU MUST LOCATE THEM for the user.
   - FORMAT: "[Item Name] ([Position]): [Status/Observation]"
   - POSITIONS to use: Top-Left, Top-Right, Center, Bottom-Left, Bottom-Right, Foreground, Background, Left-Side, Right-Side
   - EXAMPLE: "The Tomato (Bottom-Left) is overripe and soft, while the Cucumber (Top-Right) appears firm and fresh."
   - EXAMPLE: "The Carrot (Foreground) shows signs of wilting at the tip, but the Bell Pepper (Background) looks crisp."

2. **CLUMPS & BASKETS (Random piles of groceries)**
   - If items are piled or jumbled together, analyze each VISIBLE item separately
   - EXAMPLE for a grocery pile: 
     * "The Banana (Top-Center) shows brown spots indicating ripeness."
     * "The Onion (Left-Side) appears firm with no soft spots."
     * "The Lettuce (Bottom-Right, partially visible) looks fresh but outer leaves are slightly wilted."

3. **MIXED COOKED DISHES (Fried Rice, Biryani, Stew, Stir-Fry)**
   - Treat complex dishes as an INGREDIENT ASSEMBLY
   - Identify visible components separately with their locations
   - EXAMPLE for Chicken Biryani:
     * "The Chicken piece (Center, visible on surface) looks well-cooked with moist texture."
     * "The Rice grains (surrounding the chicken) appear fluffy but slightly oily."
     * "The Fried Onions (Top-Right garnish) look crispy and golden."
   - EXAMPLE for Vegetable Stir-Fry:
     * "The Broccoli florets (Left-Side) are bright green and crisp-looking."
     * "The Carrot slices (Center) appear slightly overcooked and soft."
     * "The Bell Pepper chunks (Right-Side) retain their vibrant color."

4. **NO HALLUCINATION RULE (CRITICAL)**
   - Only describe what is EXPLICITLY VISIBLE
   - If an item is partially hidden or buried, state this clearly
   - CORRECT: "The Apple (partially hidden under grapes) cannot be fully assessed, but shows no visible rot on the exposed portion."
   - WRONG: "The apple is completely fresh" (when you can only see 30% of it)
   - CORRECT: "The Rice (Background, partially obscured by meat) appears white and fluffy based on visible grains."
   - WRONG: "All the rice is perfectly cooked" (when most is hidden)

5. **GOAL: SPECIFIC, LOCATABLE REPORT**
   - The user should be able to take a picture of:
     * A random pile of groceries on a table
     * A dinner plate with multiple components
     * A fruit basket with mixed items
     * A complex dish like Biryani or Fried Rice
   - And receive a SPECIFIC REPORT on EVERY SINGLE VISIBLE ingredient with its LOCATION

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
