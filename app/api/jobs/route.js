import { NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchJobs } from '@/lib/services/jobService';
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { MOCK_JOBS } from "@/lib/data/mockJobs";

export async function GET(request) {
  try {
    // Use Clerk for authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let keywords = searchParams.get("keywords") || "";
    let location = searchParams.get("location") || "";
    let page = parseInt(searchParams.get("page") || "1");
    let jobsPerPage = parseInt(searchParams.get("jobsPerPage") || "9");
    
    // Check if specifically looking for jobs in India
    const isIndiaSearch = searchParams.get("country") === "in" || 
                          location.toLowerCase().includes("india");
                          
    // If looking for jobs in India and location doesn't specify India, add it
    if (isIndiaSearch && !location.toLowerCase().includes("india")) {
      if (location) {
        location = `${location}, India`;
      } else {
        location = "India";
      }
    }
    
    // Get user's skills and industry from the database to enhance search
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        skills: true,
        industry: true,
        preferredLocation: true
      }
    });
    
    // If no explicit location provided, use user's preferred location
    if (!location && user?.preferredLocation) {
      location = user.preferredLocation;
    }
    
    // If no explicit keywords provided, use user's skills and industry
    if (!keywords && user?.skills?.length > 0) {
      keywords = user.skills.slice(0, 3).join(" ");
    }
    
    if (!keywords && user?.industry) {
      keywords = user.industry;
    }
    
    // Default keywords if none found
    if (!keywords) {
      keywords = "software development";
    }
    
    console.log(`Searching for jobs with keywords: ${keywords}, location: ${location}, page: ${page}`);
    
    // Fetch jobs using JSearch API with the user's skills/industry
    const { jobs, totalJobs } = await fetchJobs(keywords, location, user?.skills || [], page, jobsPerPage);
    
    return NextResponse.json({ 
      jobs,
      totalJobs,
      currentPage: page,
      totalPages: Math.ceil(totalJobs / jobsPerPage)
    });
  } catch (error) {
    console.error('Error in jobs API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// Process LinkedIn API response data
function processLinkedInJobs(data, user, keywords) {
  // Transform LinkedIn API response to our job format
  const formattedJobs = data.map(job => ({
    id: job.job_id || `linkedin-${Math.random().toString(36).substr(2, 9)}`,
    title: job.job_title || 'Untitled Position',
    company: job.company_name || 'Unknown Company',
    location: job.location || 'Remote',
    description: job.job_description || '',
    url: job.linkedin_job_url_cleaned || '',
    date_posted: job.posted_date || new Date().toISOString(),
    salary: job.salary || 'Not specified',
    job_type: job.job_type || 'Full-time',
    source: 'LinkedIn',
    isMockData: false
  }));
  
  // Process the jobs to add skill matching
  const enhancedJobs = formattedJobs.map(job => {
    // Extract potential skills from job description
    const jobDescription = job.description?.toLowerCase() || "";
    const jobTitle = job.title?.toLowerCase() || "";
    
    // Common skills to look for in tech jobs
    const commonSkills = [
      "javascript", "typescript", "react", "vue", "angular", "node", "python", 
      "java", "c#", ".net", "sql", "nosql", "mongodb", "postgres", "mysql",
      "aws", "azure", "gcp", "docker", "kubernetes", "devops", "ci/cd",
      "git", "agile", "scrum", "product management", "project management",
      "ui/ux", "figma", "sketch", "adobe", "communication", "teamwork",
      "leadership", "problem-solving", "analytical", "mobile", "ios", "android",
      "flutter", "react native", "machine learning", "ai", "data science", 
      "blockchain", "security", "testing", "qa", "php", "ruby", "rails", "go"
    ];
    
    // Extract skills from job description
    const requiredSkills = commonSkills.filter(skill => 
      jobDescription.includes(skill) || jobTitle.includes(skill)
    );
    
    // Calculate match percentage if user has skills
    let matchPercentage = 0;
    let missingSkills = [];
    
    if (user?.skills?.length > 0) {
      const userSkills = user.skills.map(s => s.toLowerCase());
      const matchedSkills = requiredSkills.filter(skill => 
        userSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
      );
      
      matchPercentage = requiredSkills.length > 0 
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100) 
        : 0;
        
      // Find missing skills
      missingSkills = requiredSkills.filter(skill => 
        !userSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
      );
    }
    
    return {
      ...job,
      skills_required: requiredSkills,
      match_percentage: matchPercentage,
      missing_skills: missingSkills
    };
  });
    
  return enhancedJobs;
}
