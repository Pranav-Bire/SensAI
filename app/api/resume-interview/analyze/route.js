import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from "@clerk/nextjs/server";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

export async function POST(request) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      console.log('Authentication failed: No userId');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get resume text and industry from request body
    const { resumeText, industry } = await request.json();
    
    if (!resumeText || !industry) {
      return NextResponse.json(
        { error: "Missing resume text or industry" },
        { status: 400 }
      );
    }
    
    if (resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text is too short for accurate analysis" },
        { status: 400 }
      );
    }
    
    // Initialize Gemini model - use newer model version
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // First analyze the resume to extract key information
    const analysisPrompt = `
    Analyze this resume text and extract the following information in a structured format:
    
    1) Personal Information:
       - Name
       - Contact Information (email, phone if present)
       - Professional Title
    
    2) Skills:
       - Technical Skills (programming languages, frameworks, tools)
       - Soft Skills
       - Domain Expertise
    
    3) Experience:
       - Company names
       - Positions held
       - Duration
       - Key responsibilities and achievements (with bullet points)
    
    4) Projects:
       - Project names
       - Technologies used
       - Brief description of each project
       - Your role and contributions
    
    5) Education:
       - Degrees/certifications
       - Institutions
       - Graduation dates
    
    Resume text:
    ${resumeText}
    
    Provide a structured response that clearly separates each section. For any section where information is not available, indicate "Not specified in resume".
    `;
    
    // Use the correct format for content with parts property
    const analysisResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: analysisPrompt }] }]
    });
    const resumeAnalysis = analysisResult.response.text();
    
    // Generate interview questions based on the resume analysis
    const questionPrompt = `
    You are a senior technical interviewer for the ${industry} industry. 
    Based on this detailed resume analysis, generate 7 interview questions that will help assess the candidate thoroughly.
    
    Include:
    - 3 technical questions specific to their skills and experience
    - 2 behavioral questions based on their past projects or roles
    - 1 question about their domain knowledge
    - 1 question about their problem-solving approach
    
    Make the questions detailed, specific to their background, and designed to evaluate both technical depth and soft skills.
    Avoid generic questions that could be asked to any candidate.
    
    Format the response as a JSON array of strings. Each question should be approximately 1-3 sentences long.
    
    Resume Analysis:
    ${resumeAnalysis}
    `;
    
    // Use the correct format for content with parts property
    const questionsResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: questionPrompt }] }]
    });
    let questions = [];
    
    try {
      const questionsText = questionsResult.response.text();
      // Handle various JSON formats that might be returned
      if (questionsText.trim().startsWith('[') && questionsText.trim().endsWith(']')) {
        questions = JSON.parse(questionsText);
      } else {
        // Try to extract JSON array if wrapped in markdown or other text
        const jsonMatch = questionsText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: split by numbered list markers if JSON parsing fails
          questions = questionsText
            .split(/\d+\./)
            .map(q => q.trim())
            .filter(q => q.length > 10);
        }
      }
    } catch (parseError) {
      console.error("Failed to parse questions as JSON:", parseError);
      // Fallback to returning the raw text
      questions = [
        "Please describe your technical experience with the main technologies mentioned in your resume.",
        "Tell me about a challenging project you worked on and how you resolved technical issues.",
        "How do you approach problem-solving when faced with complex technical challenges?",
        "What are your greatest strengths as a professional in the " + industry + " field?",
        "Describe a situation where you had to work with a difficult team member and how you handled it.",
        "What are your career goals in the " + industry + " industry?",
        "How do you stay updated with the latest trends in your field?"
      ];
    }
    
    return NextResponse.json({
      questions,
      analysis: resumeAnalysis
    });
  } catch (error) {
    console.error('Error analyzing resume for interview:', error);
    return NextResponse.json(
      { error: 'Failed to analyze resume' },
      { status: 500 }
    );
  }
} 
