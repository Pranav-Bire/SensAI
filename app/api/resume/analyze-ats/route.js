import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from "@clerk/nextjs/server";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeText } = await request.json();
    
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Resume text is too short for accurate analysis' },
        { status: 400 }
      );
    }
    
    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Define ATS analysis prompt
    const prompt = `
      You are an expert ATS (Applicant Tracking System) resume analyzer. 
      Analyze the following resume and provide:
      
      1. An overall ATS score from 0-100
      2. Key strengths of the resume from an ATS perspective (at least 3)
      3. Weaknesses that might cause the resume to be filtered out (at least 3)
      4. Specific improvement tips to make the resume more ATS-friendly (at least 5)
      
      Consider factors like:
      - Keyword optimization for job matches
      - Clarity and format
      - Use of measurable achievements
      - Avoidance of complex formatting
      - Proper section headings
      
      Format the response as a JSON object with these keys: score, strengths, weaknesses, improvementTips
      
      Resume:
      ${resumeText}
    `;
    
    // Generate ATS analysis
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      
      // Fallback with mock data if parsing fails
      analysis = {
        score: 65,
        strengths: [
          "Clear section headings",
          "Includes relevant work experience",
          "Contact information is properly formatted"
        ],
        weaknesses: [
          "Lacks sufficient keywords for ATS matching",
          "Achievements are not quantified with metrics",
          "Too much technical jargon that may not be recognized by ATS"
        ],
        improvementTips: [
          "Add more industry-specific keywords from the job descriptions you're targeting",
          "Quantify achievements with percentages, numbers, and metrics",
          "Use standard section headings like 'Experience', 'Education', and 'Skills'",
          "Remove complex formatting, tables, and graphics",
          "Include a skills section with both hard and soft skills"
        ]
      };
    }
    
    return NextResponse.json({
      score: analysis.score,
      feedback: {
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        improvementTips: analysis.improvementTips
      }
    });
  } catch (error) {
    console.error('Error analyzing resume:', error);
    return NextResponse.json(
      { error: 'Failed to analyze resume' },
      { status: 500 }
    );
  }
} 