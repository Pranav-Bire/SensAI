"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function saveResume(content, atsScore = null, feedback = null) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const updateData = {
      content,
    };
    
    if (atsScore !== null) {
      updateData.atsScore = atsScore;
    }
    
    if (feedback !== null) {
      updateData.feedback = feedback;
    }
    
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error.message);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

export async function analyzeResume(fileData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const { fileName, fileType, content } = fileData;
  const fileExtension = fileName.split('.').pop().toLowerCase();
  
  try {
    // Extract text from document using Gemini
    const extractionPrompt = `
      Below is the content of a resume document in base64 format with file type: ${fileType} (${fileExtension}). 
      
      Please extract the text content from this document and convert it to properly formatted markdown.
      
      Here's the base64 content:
      ${content.substring(0, 100)}... [truncated for prompt length]
    `;
    
    // First, extract the text content
    const extractionResult = await model.generateContent(extractionPrompt);
    const extractedText = extractionResult.response.text().trim();
    
    // Get industry information for ATS analysis
    const industry = user.industry || "technology";
    const industryData = user.industryInsight || null;
    
    // Analyze the resume for ATS optimization with more document-specific analysis
    // Add a random seed to ensure different prompts generate different responses
    const randomSeed = Math.floor(Math.random() * 10000);
    
    const analysisPrompt = `
      As an expert resume analyst specializing in ATS (Applicant Tracking System) optimization for the ${industry} industry, please analyze the following resume with extreme detail and precision. This is analysis session ${randomSeed}:

      '''
      ${extractedText}
      '''

      Provide a comprehensive and HIGHLY SPECIFIC ATS analysis with the following information in JSON format:
      
      1. atsScore: A number between 0-100 that represents how likely this resume is to pass ATS systems. Calculate this precisely based on:
         - Format and structure quality: 20% of score
         - Keyword relevance: 30% of score
         - Content clarity: 25% of score
         - Overall impression: 25% of score
         Calculate a unique score for each document, avoiding default values like 65.

      2. keywordMatch: A percentage (0-100) of industry keywords present in the resume, calculated by counting actual keywords found divided by total expected keywords for this industry. Be precise in this calculation.
      
      3. feedback: A concise overall assessment (1-2 paragraphs) that addresses THIS specific resume's unique strengths and weaknesses. Avoid generic language.
      
      4. detectedKeywords: An array of industry-relevant keywords ACTUALLY found in this specific resume text. These should be exact matches, not assumptions.
      
      5. missingKeywords: An array of important industry keywords that this specific resume is missing, tailored to the specific career path shown in the resume.
      
      6. improvementTips: An array of 5-8 specific, actionable tips to improve THIS resume. Each tip should be a complete sentence that does NOT begin with a dash or hyphen. Format as complete sentences without bullet points or dashes.
      
      7. resumeStructure: An array of objects with the format {name: "section_name", status: "present/missing", description: "why important"} based on sections actually present or missing in this document.
      
      8. strengthsAndWeaknesses: An object with two arrays - strengths and weaknesses that are UNIQUE to this resume. Each item should be a complete sentence without dashes or hyphens.

      ${industryData ? `
      Use the following industry insights in your analysis:
      Top Industry Skills: ${industryData.topSkills.join(', ')}
      Recommended Skills: ${industryData.recommendedSkills.join(', ')}
      Industry Growth Rate: ${industryData.growthRate}
      Demand Level: ${industryData.demandLevel}
      ` : ''}

      IMPORTANT REQUIREMENTS:
      1. Your analysis must be COMPLETELY UNIQUE to this document.
      2. Do not use generic feedback - analyze the actual content.
      3. Format all text as complete sentences without bullet points, dashes or hyphens.
      4. The atsScore MUST vary between documents and be precisely calculated based on the actual content quality - NEVER default to 65 or any standard score.
      5. Different resumes should receive different scores ranging from 40-95 depending on their quality.
      6. Ensure all improvements are specific to the content in THIS document.
      7. Review the document thoroughly to find specific issues and quantify them in your scoring.

      Return ONLY the JSON object with no additional text or explanations.
    `;

    // Get the analysis with enhanced specificity and force uniqueness
    const analysisResult = await model.generateContent([
      { text: analysisPrompt },
      { text: `Important instructions for analysis session ${randomSeed}:
        1. Make sure to include detailed and actionable advice specifically for the ${industry} industry.
        2. Your analysis MUST be unique to this document and not generic.
        3. The atsScore should accurately reflect the quality of THIS specific resume on a scale of 0-100.
        4. Format all text as complete sentences without bullet points, dashes, or hyphens.
        5. Each document should receive a different score based on its quality - do not default to a standard score.
      ` },
    ]);
    
    let analysisData;
    try {
      let analysisText = analysisResult.response.text().trim();
      
      // Check if the response is wrapped in markdown code block and extract the JSON
      if (analysisText.startsWith("```json")) {
        analysisText = analysisText.replace(/```json\n|\n```/g, "");
      } else if (analysisText.startsWith("```")) {
        analysisText = analysisText.replace(/```\n|\n```/g, "");
      }
      
      // Parse the JSON response
      let parsedData = JSON.parse(analysisText);
      
      // Clean up any formatting issues in text fields
      if (parsedData.improvementTips) {
        parsedData.improvementTips = parsedData.improvementTips.map(tip => {
          // Remove any leading dashes or bullet points
          return tip.replace(/^[-•*]\s*/, '');
        });
      }
      
      if (parsedData.strengthsAndWeaknesses) {
        if (parsedData.strengthsAndWeaknesses.strengths) {
          parsedData.strengthsAndWeaknesses.strengths = parsedData.strengthsAndWeaknesses.strengths.map(
            item => item.replace(/^[-•*]\s*/, '')
          );
        }
        
        if (parsedData.strengthsAndWeaknesses.weaknesses) {
          parsedData.strengthsAndWeaknesses.weaknesses = parsedData.strengthsAndWeaknesses.weaknesses.map(
            item => item.replace(/^[-•*]\s*/, '')
          );
        }
      }
      
      analysisData = parsedData;
    } catch (error) {
      console.error("Error parsing ATS analysis JSON:", error);
      throw new Error("Failed to parse resume analysis");
    }
    
    // Try to extract structured data if possible
    const extractDataPrompt = `
      Based on the resume:
      
      '''
      ${extractedText}
      '''
      
      Extract the following structured data in JSON format:
      
      1. contactInfo: Object with email, phone, linkedin URL
      2. summary: The professional summary text
      3. skills: Array of skills mentioned
      4. experience: Array of work experiences with {title, company, location, startDate, endDate, current, description}
      5. education: Array of education entries with {degree, school, location, year}
      6. projects: Array of projects with {name, description, technologies}
      
      Return ONLY the JSON object with no additional text or explanations.
    `;
    
    // Extract structured data if possible
    let extractedData = null;
    try {
      const extractDataResult = await model.generateContent(extractDataPrompt);
      let extractDataText = extractDataResult.response.text().trim();
      
      // Check if the response is wrapped in markdown code block and extract the JSON
      if (extractDataText.startsWith("```json")) {
        extractDataText = extractDataText.replace(/```json\n|\n```/g, "");
      } else if (extractDataText.startsWith("```")) {
        extractDataText = extractDataText.replace(/```\n|\n```/g, "");
      }
      
      extractedData = JSON.parse(extractDataText);
    } catch (error) {
      console.error("Error extracting structured data:", error);
      // This is optional, so we can continue even if it fails
    }
    
    // Save the analysis to the database
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content: extractedText,
        atsScore: analysisData.atsScore,
        feedback: analysisData.feedback,
        // Use the built-in updatedAt field to track when analysis was performed
      },
      create: {
        userId: user.id,
        content: extractedText,
        atsScore: analysisData.atsScore,
        feedback: analysisData.feedback,
        // The updatedAt field will automatically be set
      },
    });
    
    // Return the full analysis with the extracted content
    return {
      ...analysisData,
      extractedContent: extractedText,
      extractedData: extractedData,
    };
    
  } catch (error) {
    console.error("Error analyzing resume:", error.message);
    throw new Error("Failed to analyze resume");
  }
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  let prompt;
  if (type === 'summary') {
    prompt = `
      As an expert resume writer, improve the following professional summary for a ${user.industry} professional.
      Make it more impactful and aligned with industry standards.
      Current content: "${current}"

      Requirements:
      1. Start with a strong opening statement
      2. Highlight key expertise and achievements
      3. Include relevant technical skills and specializations
      4. Keep it concise (2-3 sentences)
      5. Use industry-specific keywords
      6. Maintain a professional tone
      
      Format the response as a single paragraph without any additional text or explanations.
    `;
  } else {
    prompt = `
      As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
      Make it more impactful, quantifiable, and aligned with industry standards.
      Current content: "${current}"

      Requirements:
      1. Use action verbs
      2. Include metrics and results where possible
      3. Highlight relevant technical skills
      4. Keep it concise but detailed
      5. Focus on achievements over responsibilities
      6. Use industry-specific keywords
      
      Format the response as a single paragraph without any additional text or explanations.
    `;
  }

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const improvedContent = response.text().trim();
    return improvedContent;
  } catch (error) {
    console.error("Error improving content:", error.message);
    throw new Error("Failed to improve content");
  }
}