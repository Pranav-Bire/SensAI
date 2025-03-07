"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateAIInsights = async (industry) => {
    
    
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

        const result = await model.generateContent(prompt);
        const response = result.response;

        const text = response.text();


        const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
        // const industryInsight = await db.industryInsight.create({
        // data: {
        //     industry: industry,
        //     salaryRanges: [],
        //     growthRate: 0,
        //     DemandLevel: "HIGH", // Changed from "High" to "HIGH"
        //     topSkills: [],
        //     marketOutlook: "NEUTRAL",
        //     keyTrends: [],
        //     recommendedSkills: [],
        //     nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        // },
        // });
        
        return JSON.parse(cleanedText);

}    

export async function getIndustryInsights() {

    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");


    const user = await db.user.findUnique({
        where: { clerkUserId: userId }, 
        include: {
            industryInsight: true
        },
    });

    if(!user) throw new Error("User not found");

    if (!user.industryInsight) {
        const insights = await generateAIInsights(user.industry);

        const industryInsight = await db.industryInsight.create({
            data: {
                industry: user.industry,

                ...insights,
                nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              
            },
        });


        return industryInsight;
    }

    return user.industryInsight;
  
}