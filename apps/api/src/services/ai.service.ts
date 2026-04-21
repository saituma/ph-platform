import OpenAI from "openai";
import { env } from "../config/env";

import { eq } from "drizzle-orm";
import { db } from "../db";
import { userTable } from "../db/schema";

const openai = new OpenAI({
  apiKey: env.openaiApiKey,
});

export async function ensureAiCoachUser() {
  const email = "ai-coach@football-performance.ai";
  const existing = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existing[0]) return existing[0].id;

  const [inserted] = await db
    .insert(userTable)
    .values({
      name: "AI Coach",
      email: email,
      role: "admin",
      cognitoSub: "ai-coach-virtual-sub",
    })
    .returning();

  return inserted.id;
}

const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * System prompts designed to be extremely concise to save tokens.
 */
const SYSTEM_PROMPTS = {
  COACH_CHAT: `You are PH AI Coach, a world-class elite football (soccer) performance expert. 
Provide technical training advice, tactical insights, and high-performance motivation.
Be professional, elite, and extremely concise. Use bullet points for drills. Max 100 words.`,

  VIDEO_FEEDBACK: `Analyze the provided notes about a football training video.
Provide 3 actionable technical tips for improvement.
Be direct, elite, and very concise. Max 60 words.`,

  CONTENT_SUMMARY: `Summarize the following football training content for a specific age group.
Explain why it is important and what the key takeaway is.
Be elite, snappy, and very concise. Max 50 words.`,

  PARENT_INSIGHT: `You are an expert football (soccer) parent educator.
Analyze the provided course material and summarize the 3 most important takeaways for a guardian.
Explain how they can support their athlete based on this content.
Be supportive, professional, and very concise. Max 80 words.`,
};

export async function generateAiCoachResponse(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
) {
  if (!env.openaiApiKey) return "AI Coach is currently offline (API key missing).";

  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.COACH_CHAT },
        ...history.slice(-5), // Keep only last 5 messages for context/token saving
        { role: "user", content: userMessage },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return (
      response.choices[0]?.message?.content?.trim() ??
      "I'm having trouble thinking right now. Let's try again in a moment."
    );
  } catch (error) {
    console.error("[AI Service] Error generating coach response:", error);
    return "I'm experiencing a tactical delay. Please try again later.";
  }
}

export async function generateVideoFeedback(notes: string) {
  if (!env.openaiApiKey) return null;

  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.VIDEO_FEEDBACK },
        { role: "user", content: `Athlete notes: ${notes}` },
      ],
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("[AI Service] Error generating video feedback:", error);
    return null;
  }
}

export async function generateContentSummary(title: string, content: string, ageGroup?: string) {
  if (!env.openaiApiKey) return null;

  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.CONTENT_SUMMARY },
        { role: "user", content: `Title: ${title}\nAge Group: ${ageGroup ?? "All"}\nContent: ${content}` },
      ],
      max_tokens: 80,
    });

    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("[AI Service] Error generating content summary:", error);
    return null;
  }
}

export async function generateParentEducationalInsight(courseContext: string) {
  if (!env.openaiApiKey) return null;

  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.PARENT_INSIGHT },
        { role: "user", content: courseContext },
      ],
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("[AI Service] Error generating parent insight:", error);
    return null;
  }
}
