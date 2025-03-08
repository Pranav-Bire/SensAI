"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Validate required fields
  if (!data.industry) {
    throw new Error("Industry is required");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const insights = await generateAIInsights(data.industry);
    
    // Ensure enum values are uppercase
    insights.demandLevel = insights.demandLevel.toUpperCase();
    insights.marketOutlook = insights.marketOutlook.toUpperCase();

    const result = await db.$transaction(async (tx) => {
      // First check if industry exists
      let industryInsight = await tx.industryInsight.findUnique({
        where: {
          industry: data.industry,
        },
      });

      // If industry doesn't exist, create it with default values
      if (!industryInsight) {
        industryInsight = await tx.industryInsight.create({
          data: {
            industry: data.industry,
            ...insights,
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      } else {
        // Update existing industry insight
        industryInsight = await tx.industryInsight.update({
          where: { industry: data.industry },
          data: {
            ...insights,
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Now update the user with the correct relationship
      const updatedUser = await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          industryInsight: {
            connect: {
              industry: data.industry
            }
          },
          experience: data.experience,
          bio: data.bio,
          skills: data.skills,
          onboardingCompleted: true
        },
        include: {
          industryInsight: true
        }
      });

      return { updatedUser, industryInsight };
    });

    revalidatePath("/");
    return {success: true, ...result};
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile: " + error.message);
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        onboardingCompleted: true,
      },
    });

    if (!user) throw new Error("User not found");

    return {
      redirect: user.onboardingCompleted ? '/dashboard' : '/onboarding',
      isOnboarded: user.onboardingCompleted
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error.message);
    throw new Error("Failed to check onboarding status");
  }
}