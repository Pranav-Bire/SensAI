"use server";

import { db } from "@/lib/db";

// In-memory storage for jobs when no database is available
const memoryFavoriteJobs = [];

// Mock user ID for development
const MOCK_USER_ID = "user_2NV8Xs6M8KpCss44siHFgXl";

/**
 * Mock auth function that returns a userId for development
 */
async function getAuthUserId() {
  try {
    // In production, this would use the real Clerk auth
    // const { userId } = await auth();
    
    // For development, use a mock user ID
    const userId = MOCK_USER_ID;
    console.log('Using mock user ID for authentication:', userId);
    return { userId };
  } catch (error) {
    console.error('Auth error:', error);
    return { userId: null };
  }
}

/**
 * Save a job to user favorites
 */
export async function saveJobToFavorites(job) {
  try {
    const { userId } = await getAuthUserId();
    if (!userId) throw new Error("Unauthorized - You must be logged in to save jobs");

    try {
      // Try to get user from database
      const user = await db.user.findUnique({
        where: { clerkUserId: userId },
      });

      if (user) {
        // If we have a database and user, save to DB
        await db.savedJob.create({
          data: {
            userId: user.id,
            jobTitle: job.title,
            company: job.company,
            location: job.location || '',
            description: job.description || '',
            url: job.url,
            jobSource: job.source || "JSearch",
            jobSkills: job.jobSkills || [],
            matchPercentage: job.matchPercentage || 0,
            // Additional JSearch fields
            companyLogo: job.company_logo || null,
            salary: job.salary || 'Not specified',
            jobType: job.job_type || 'Full-time',
            datePosted: job.date_posted ? new Date(job.date_posted) : new Date(),
            // Store additional details as JSON
            additionalDetails: JSON.stringify({
              highlights: job.highlights || [],
              qualifications: job.qualifications || [],
              benefits: job.benefits || [],
              isRemote: job.is_remote || false,
              companyWebsite: job.company_website || null
            })
          },
        });
        
        console.log('Job saved to database successfully');
      } else {
        console.log('User not found in database, using memory storage');
        // Fall back to memory storage
        saveToMemory(userId, job);
      }

      return { success: true };
    } catch (error) {
      console.error("Database error when saving job:", error);
      // Fallback to memory storage if database fails
      saveToMemory(userId, job);
      return { success: true, usingMemoryStorage: true };
    }
  } catch (authError) {
    console.error("Authentication error:", authError);
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Save job to memory storage
 */
function saveToMemory(userId, job) {
  const jobWithUserId = {
    ...job,
    userId,
    savedAt: new Date(),
  };
  
  // Remove any existing job with the same URL
  const existingIndex = memoryFavoriteJobs.findIndex(
    j => j.userId === userId && j.url === job.url
  );
  
  if (existingIndex !== -1) {
    memoryFavoriteJobs.splice(existingIndex, 1);
  }
  
  // Add to memory storage
  memoryFavoriteJobs.push(jobWithUserId);
  console.log(`Job saved to memory storage for user ${userId}`);
}

/**
 * Remove a job from favorites by URL
 */
export async function removeJobFromFavorites(jobUrl) {
  try {
    const { userId } = await getAuthUserId();
    if (!userId) throw new Error("Unauthorized - You must be logged in to remove saved jobs");

    try {
      // Try to get user from database
      const user = await db.user.findUnique({
        where: { clerkUserId: userId },
      });

      if (user) {
        // If we have a database and user, delete from DB
        await db.savedJob.deleteMany({
          where: {
            userId: user.id,
            url: jobUrl,
          },
        });
        console.log('Job removed from database successfully');
      }
      
      // Always remove from memory storage too
      removeFromMemory(userId, jobUrl);

      return { success: true };
    } catch (error) {
      console.error("Database error when removing job:", error);
      // Fallback to just removing from memory
      removeFromMemory(userId, jobUrl);
      return { success: true, usingMemoryStorage: true };
    }
  } catch (authError) {
    console.error("Authentication error:", authError);
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Remove job from memory storage
 */
function removeFromMemory(userId, jobUrl) {
  const initialLength = memoryFavoriteJobs.length;
  const filteredJobs = memoryFavoriteJobs.filter(
    job => !(job.userId === userId && job.url === jobUrl)
  );
  
  const removedCount = initialLength - filteredJobs.length;
  Object.assign(memoryFavoriteJobs, filteredJobs);
  
  console.log(`Removed ${removedCount} job(s) from memory storage for user ${userId}`);
}

/**
 * Get a user's saved jobs
 */
export async function getSavedJobs() {
  try {
    const { userId } = await getAuthUserId();
    if (!userId) return [];

    try {
      // Get user ID from clerk user ID
      const user = await db.user.findUnique({
        where: { clerkUserId: userId },
      });

      if (user) {
        // If we have a database and user, get from DB
        const savedJobs = await db.savedJob.findMany({
          where: {
            userId: user.id,
          },
          orderBy: {
            savedAt: "desc",
          },
        });

        console.log(`Retrieved ${savedJobs.length} jobs from database for user ${userId}`);
        
        // Map to the format expected by the frontend
        return savedJobs.map((job) => ({
          title: job.jobTitle,
          company: job.company,
          location: job.location,
          description: job.description,
          url: job.url,
          jobSource: job.jobSource,
          jobSkills: job.jobSkills,
          matchPercentage: job.matchPercentage,
          savedAt: job.savedAt,
        }));
      } else {
        console.log('User not found in database, using memory storage');
        // If no database or user not found, get from memory
        return getFromMemory(userId);
      }
    } catch (error) {
      console.error("Database error when fetching saved jobs:", error);
      // Fallback to memory storage
      return getFromMemory(userId);
    }
  } catch (authError) {
    console.error("Authentication error:", authError);
    return [];
  }
}

/**
 * Get jobs from memory storage
 */
function getFromMemory(userId) {
  const userJobs = memoryFavoriteJobs.filter(job => job.userId === userId);
  console.log(`Retrieved ${userJobs.length} jobs from memory storage for user ${userId}`);
  
  return [...userJobs].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));