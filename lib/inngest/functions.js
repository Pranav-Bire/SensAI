import { db } from "../prisma";
import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateIndustryInsights = inngest.createFunction(
  {
    id: "generate-industry-insights",
    name: "Generate Industry Insights",
  },
  { cron: "0 0 * * 0" }, // Run every Sunday at midnight
  async ({ step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    for (const { industry } of industries) {
      const prompt = `
        Generate industry insights for ${industry} industry.
        Return a JSON object with the following fields:
        - salaryRanges: array of objects with {role, min, max, median, location} for different roles
        - growthRate: number representing annual growth rate
        - demandLevel: must be exactly one of: "HIGH", "MEDIUM", or "LOW"
        - topSkills: array of strings representing key skills
        - marketOutlook: must be exactly one of: "POSITIVE", "NEUTRAL", or "NEGATIVE"
        - keyTrends: array of strings representing industry trends
        - recommendedSkills: array of strings representing skills to learn
        
        Note: demandLevel and marketOutlook values must be in uppercase.
        Include atleast 5 skills and trends.
      `;

      const response = await step.ai.wrap(
        "gemini",
        async (p) => {
          return await model.generateContent(p);
        },
        prompt
      );

      const text = response.response.candidates[0].content.parts[0].text || "";
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
      const insights = JSON.parse(cleanedText);

      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry },
          data: {
            ...insights,
            lastUpdated: new Date(),
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });
    }
  }
);