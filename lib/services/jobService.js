// Job service with hardcoded jobs data
import { MOCK_JOBS } from '@/lib/data/mockJobs';

// Flag to indicate if we're using hardcoded data due to API issues
let usingMockData = false; // Default to real API, fallback to mock data if API fails

// Cache structure
let jobCache = {
  data: null,
  lastFetched: null,
  params: null,
  totalJobs: null
};

/**
 * Parse job skills from description
 */
export function extractJobSkills(description, possibleSkills) {
  const descriptionLower = description?.toLowerCase() || '';
  return possibleSkills.filter(skill => 
    descriptionLower.includes(skill.toLowerCase())
  );
}

/**
 * Calculate skill match percentage
 */
export function calculateSkillMatch(jobSkills, userSkills) {
  const commonSkills = [];
  const missingSkills = [];
  
  if (userSkills.length > 0 && jobSkills.length > 0) {
    jobSkills.forEach(skill => {
      // Enhanced skill matching logic with partial matches
      const found = userSkills.some(userSkill => {
        const userSkillLower = userSkill.toLowerCase();
        const skillLower = skill.toLowerCase();
        
        // Check for exact matches
        if (userSkillLower === skillLower) return true;
        
        // Check for partial matches (one contains the other)
        if (userSkillLower.includes(skillLower) || skillLower.includes(userSkillLower)) return true;
        
        // Check for related technologies
        if ((skillLower === 'js' && userSkillLower === 'javascript') ||
            (skillLower === 'javascript' && userSkillLower === 'js') ||
            (skillLower === 'ts' && userSkillLower === 'typescript') ||
            (skillLower === 'typescript' && userSkillLower === 'ts') ||
            (skillLower === 'react' && userSkillLower.includes('frontend')) ||
            (skillLower.includes('frontend') && userSkillLower === 'react') ||
            (skillLower === 'node' && userSkillLower.includes('backend')) ||
            (skillLower.includes('backend') && userSkillLower === 'node')) {
          return true;
        }
        
        return false;
      });
      
      if (found) {
        commonSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });
  }
  
  // More generous matching percentage calculation
  // Base percentage on both matching skills and total skills
  let matchPercentage = 0;
  if (jobSkills.length > 0) {
    // Give some base match percentage for having any skills (min 20%)
    matchPercentage = Math.max(
      Math.round((commonSkills.length / jobSkills.length) * 100),
      userSkills.length > 0 ? 20 : 0
    );
    
    // Bonus for having more than 50% matching skills
    if (commonSkills.length > jobSkills.length / 2) {
      matchPercentage += 10;
    }
    
    // Cap at 100%
    matchPercentage = Math.min(matchPercentage, 100);
  }
  
  return {
    commonSkills,
    missingSkills,
    matchPercentage
  };
}

/**
 * Process jobs to extract skills and calculate match
 */
export function processJobs(jobList, userSkills = []) {
  // List of common tech skills that might be in job descriptions
  const possibleSkills = [
    'react', 'javascript', 'typescript', 'node', 'python', 'java', 'c++', 'c#', '.net',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'sql', 'nosql', 'mongodb', 'postgres',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'git', 'agile', 'scrum', 'jenkins',
    'ci/cd', 'rest api', 'graphql', 'redux', 'vue', 'angular', 'express', 'django',
    'flutter', 'swift', 'kotlin', 'android', 'ios', 'machine learning', 'ai', 'data science'
  ];

  return jobList.map(job => {
    // Extract skills from job description
    const jobSkills = extractJobSkills(job.description, possibleSkills);
    
    // Calculate match with user skills
    const { commonSkills, missingSkills, matchPercentage } = calculateSkillMatch(jobSkills, userSkills);
    
    // Add flag to indicate if this job is from mock data
    return {
      ...job,
      jobSkills,
      commonSkills,
      missingSkills,
      matchPercentage,
      isMockData: usingMockData
    };
  });
}

/**
 * Fetch jobs from JSearch API
 */
export async function fetchJobs(searchTerms = '', location = '', userSkills = [], page = 1, jobsPerPage = 9) {
  // Check cache first
  const cacheKey = `${searchTerms}-${location}-${page}`;
  if (jobCache.data && jobCache.params === cacheKey && 
      jobCache.lastFetched && (Date.now() - jobCache.lastFetched < 5 * 60 * 1000)) {
    console.log('Using cached job data');
    return {
      jobs: processJobs(jobCache.data.slice(0, jobsPerPage), userSkills),
      totalJobs: jobCache.totalJobs || jobCache.data.length
    };
  }
  
  try {
    // Fetch from JSearch API via RapidAPI
    console.log('Fetching jobs from JSearch API...');
    
    // Build query string with industry/skills
    let query = searchTerms || 'software development';
    
    // Determine country code based on location
    let country = 'us';  // Default
    if (location && (
        location.toLowerCase().includes('india') || 
        location.toLowerCase().includes('delhi') ||
        location.toLowerCase().includes('mumbai') ||
        location.toLowerCase().includes('bangalore') ||
        location.toLowerCase().includes('hyderabad') ||
        location.toLowerCase().includes('chennai') ||
        location.toLowerCase().includes('kolkata')
      )) {
      country = 'in';
      // If India is detected in location, make sure it's in the query
      if (!location.toLowerCase().includes('india')) {
        location = `${location}, India`;
      }
    }
    
    // Add location to query if provided
    if (location) {
      query += ` in ${location}`;
    }
    
    // Create proper URL with encoded query parameters
    const baseUrl = 'https://jsearch.p.rapidapi.com/search';
    const encodedQuery = encodeURIComponent(query);
    // Request more jobs than needed to ensure we get enough valid ones
    const requestSize = jobsPerPage * 2;
    const url = `${baseUrl}?query=${encodedQuery}&page=${page}&num_pages=1&page_size=${requestSize}&country=${country}&date_posted=all`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': 'adf40725a4msh92ce80ba51466e5p1786dbjsn129863b5fa38',
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`JSearch API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    usingMockData = false;
    
    // Transform JSearch API response to our job format
    const formattedJobs = data.data.map(job => ({
      id: job.job_id || `jsearch-${Math.random().toString(36).substr(2, 9)}`,
      title: job.job_title || 'Untitled Position',
      company: job.employer_name || 'Unknown Company',
      location: job.job_city || job.job_country || job.job_location || 'Remote',
      description: job.job_description || '',
      url: job.job_apply_link || job.job_google_link || '',
      date_posted: job.job_posted_at_datetime_utc || new Date().toISOString(),
      salary: job.job_min_salary && job.job_max_salary 
        ? `${job.job_min_salary} - ${job.job_max_salary} ${job.job_salary_currency || 'USD'}` 
        : job.job_salary || 'Not specified',
      job_type: job.job_employment_type || 'Full-time',
      source: job.job_publisher || 'JSearch',
      company_logo: job.employer_logo || null,
      highlights: job.job_highlights || [],
      company_website: job.employer_website || null,
      is_remote: job.job_is_remote || false,
      qualifications: job.job_required_skills || [],
      benefits: job.job_benefits || [],
      country: country
    }));
    
    // Take exactly jobsPerPage jobs
    const paginatedJobs = formattedJobs.slice(0, jobsPerPage);
    
    // Update cache with the paginated jobs
    jobCache.data = paginatedJobs;
    jobCache.lastFetched = Date.now();
    jobCache.params = cacheKey;
    // Estimate total jobs based on API response
    jobCache.totalJobs = Math.max(data.total || formattedJobs.length * 5, paginatedJobs.length);
    
    return {
      jobs: processJobs(paginatedJobs, userSkills),
      totalJobs: jobCache.totalJobs
    };
  } catch (error) {
    // If JSearch API request fails, fall back to mock data
    console.error('Error fetching jobs from JSearch API, falling back to mock data:', error);
    usingMockData = true;
    
    let filteredJobs = [...MOCK_JOBS];
    
    // Apply search filters
    if (searchTerms) {
      const terms = searchTerms.toLowerCase();
      filteredJobs = filteredJobs.filter(job => 
        job.title.toLowerCase().includes(terms) || 
        job.company.toLowerCase().includes(terms) ||
        job.description.toLowerCase().includes(terms)
      );
    }
    
    if (location) {
      const locationLower = location.toLowerCase();
      filteredJobs = filteredJobs.filter(job => 
        job.location.toLowerCase().includes(locationLower)
      );
    }
    
    // Add mock data note to each job title
    filteredJobs = filteredJobs.map(job => ({
      ...job,
      originalTitle: job.title,
      title: job.title + ' (Demo)'
    }));
    
    // Handle pagination for mock data
    const startIndex = (page - 1) * jobsPerPage;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + jobsPerPage);
    
    return {
      jobs: processJobs(paginatedJobs, userSkills),
      totalJobs: filteredJobs.length
    };
  }
}

/**
 * Check if we're using mock data
 */
export function isUsingMockData() {
  return usingMockData;
}

/**
 * Save job to user favorites
 * This is a placeholder that could be implemented with a database
 */
export async function saveJob(userId, job) {
  // This would typically involve a database call
  console.log(`Saving job ${job.id} for user ${userId}`);
  return { success: true, message: 'Job saved to favorites' };
}

/**
 * Get user's favorite jobs
 * This is a placeholder that could be implemented with a database
 */
export async function getFavoriteJobs(userId) {
  // This would typically involve a database call
  console.log(`Fetching favorite jobs for user ${userId}`);
  return []; // Return empty array for now
} 