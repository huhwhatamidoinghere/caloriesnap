import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FoodItem {
  name: string;
  estimatedWeight: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
}

export interface NutritionAnalysis {
  items: FoodItem[];
  totalCalories: number;
  summary: string;
  advice?: string;
}

export async function analyzeFoodImage(
  base64Image: string, 
  minCalories?: number, 
  maxCalories?: number
): Promise<NutritionAnalysis> {
  const model = "gemini-3-flash-preview";
  
  let goalPrompt = "";
  if (minCalories !== undefined && maxCalories !== undefined) {
    goalPrompt = `The user's target calorie range for this meal is ${minCalories} to ${maxCalories} calories. If the current meal is outside this range, provide specific advice on what to remove, reduce, or replace to meet this goal.`;
  }

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
          {
            text: `Analyze this image of food. Identify each food item, estimate its weight/portion size, and provide nutritional information (calories, protein, carbs, fat). Use Google Search to verify calorie counts if you are unsure. Also provide a total calorie count for the entire meal and a brief summary. ${goalPrompt} Be as accurate as possible with estimates.`,
          },
        ],
      },
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                estimatedWeight: { type: Type.STRING },
                calories: { type: Type.NUMBER },
                protein: { type: Type.STRING },
                carbs: { type: Type.STRING },
                fat: { type: Type.STRING },
              },
              required: ["name", "estimatedWeight", "calories"],
            },
          },
          totalCalories: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          advice: { type: Type.STRING, description: "Advice on how to meet the calorie goals if provided." },
        },
        required: ["items", "totalCalories", "summary"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}") as NutritionAnalysis;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to analyze image");
  }
}

export interface CalendarDay {
  day: string;
  activity: string;
  details?: string;
}

export interface WorkoutPlan {
  targetBodyPart: string;
  duration?: string;
  complementaryWorkouts?: string[];
  workoutCalendar?: CalendarDay[];
  dietCalendar?: CalendarDay[];
  analysis: string;
}

export interface ExerciseInfo {
  name: string;
  explanation: string;
  imageUrl?: string;
}

export async function getExerciseInfo(exerciseName: string): Promise<ExerciseInfo> {
  const textModel = "gemini-3-flash-preview";
  const imageModel = "gemini-2.5-flash-image";

  // 1. Get explanation
  const textResponse = await ai.models.generateContent({
    model: textModel,
    contents: [{ parts: [{ text: `Provide a very brief, 1-2 sentence explanation of how to perform the exercise: "${exerciseName}". Focus only on the essential movement.` }] }],
  });

  const explanation = textResponse.text || "No explanation available.";

  // 2. Generate image
  let imageUrl: string | undefined;
  try {
    const imageResponse = await ai.models.generateContent({
      model: imageModel,
      contents: [{ parts: [{ text: `A clear, instructional illustration or photo of a person performing the exercise: ${exerciseName}. Professional fitness style, white background.` }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  } catch (error) {
    console.error("Failed to generate exercise image:", error);
  }

  return {
    name: exerciseName,
    explanation,
    imageUrl,
  };
}

export interface JourneyPlan {
  distanceMiles: number;
  caloriesBurned: number;
  stepRange: string;
  treadmillEquivalent?: {
    timeMinutes: number;
    speedMph: number;
    inclinePercent: number;
    description: string;
  };
  summary: string;
}

export async function calculateJourney(params: {
  from: string;
  to: string;
  includeTreadmill: boolean;
}): Promise<JourneyPlan> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Calculate the walking journey details between "${params.from}" and "${params.to}".
    Provide:
    - Estimated distance in miles.
    - Estimated calories burned for an average adult walking.
    - Estimated range of steps.
    ${params.includeTreadmill ? "- A treadmill equivalent (time, speed, incline) to achieve the same calorie burn and distance effect." : ""}
    - A brief summary of the route.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          distanceMiles: { type: Type.NUMBER },
          caloriesBurned: { type: Type.NUMBER },
          stepRange: { type: Type.STRING },
          treadmillEquivalent: {
            type: Type.OBJECT,
            properties: {
              timeMinutes: { type: Type.NUMBER },
              speedMph: { type: Type.NUMBER },
              inclinePercent: { type: Type.NUMBER },
              description: { type: Type.STRING }
            },
            required: ["timeMinutes", "speedMph", "inclinePercent", "description"]
          },
          summary: { type: Type.STRING }
        },
        required: ["distanceMiles", "caloriesBurned", "stepRange", "summary"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as JourneyPlan;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to calculate journey");
  }
}

export async function generateWorkoutPlan(params: {
  currentWeight?: number;
  targetWeight?: number;
  exercise: string;
  includeCalendar: boolean;
  includeDuration: boolean;
  includeComplementary: boolean;
  includeDiet: boolean;
}): Promise<WorkoutPlan> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Generate a comprehensive fitness and nutrition plan based on the following:
    - Exercise being done: ${params.exercise}
    - Current Weight: ${params.currentWeight || "Not provided"}
    - Target Weight: ${params.targetWeight || "Not provided"}
    
    Requested details:
    ${params.includeCalendar ? "- A weekly workout calendar (7 days)" : ""}
    ${params.includeDuration ? "- Recommended duration for the exercise" : ""}
    ${params.includeComplementary ? "- Other workouts that complement this exercise" : ""}
    ${params.includeDiet ? "- A meal/diet calendar (7 days) to compliment this exercise and weight goals" : ""}
    
    The plan should specifically address the body parts targeted by "${params.exercise}".
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetBodyPart: { type: Type.STRING },
          duration: { type: Type.STRING },
          complementaryWorkouts: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          workoutCalendar: { 
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING, description: "Day of the week (e.g., Monday)" },
                activity: { type: Type.STRING, description: "Main activity or workout" },
                details: { type: Type.STRING, description: "Specific exercises or sets" }
              },
              required: ["day", "activity"]
            }
          },
          dietCalendar: { 
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING, description: "Day of the week" },
                activity: { type: Type.STRING, description: "Main meal focus" },
                details: { type: Type.STRING, description: "Breakfast, Lunch, Dinner suggestions" }
              },
              required: ["day", "activity"]
            }
          },
          analysis: { type: Type.STRING, description: "Overall analysis and advice." },
        },
        required: ["targetBodyPart", "analysis"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}") as WorkoutPlan;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to generate workout plan");
  }
}
