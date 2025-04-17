import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from "@clerk/nextjs/server";
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(request) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeText, industry } = await request.json();

    if (!resumeText || !industry) {
      return NextResponse.json({ 
        error: "Resume text and industry are required" 
      }, { status: 400 });
    }

    // Generate first question based on resume analysis
    const initialPrompt = `You are an expert technical interviewer conducting an interview for a ${industry} position.

Resume Text:
${resumeText}

Task: Analyze this resume and generate an appropriate first interview question that:
1. Is directly related to the candidate's most relevant experience
2. Is clear and easy to understand
3. Focuses on practical experience rather than theoretical knowledge
4. Can be answered in 2-3 minutes
5. Helps evaluate their technical skills in a comfortable way
6. Avoids overly complex or intimidating topics

The question should make the candidate feel comfortable while still being meaningful.
Return ONLY the question text, nothing else.`;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: initialPrompt }] }]
      });

      const firstQuestion = result.response.text().trim();
      
      // Create a new session
      const sessionId = uuidv4();
      
      // Initialize interview session
      global.interviewSessions = global.interviewSessions || {};
      global.interviewSessions[sessionId] = {
        resumeText,
        industry,
        questions: [firstQuestion],
        answers: [],
        answerAnalyses: [],
        questionCount: 1,
        createdAt: new Date().toISOString()
      };

      // Create response with session data
      const response = NextResponse.json({
        success: true,
        sessionId,
        question: firstQuestion
      });

      // Set session cookie directly on the response
      response.cookies.set('interview_session', sessionId, {
        maxAge: 60 * 60, // 1 hour
        path: '/',
      });

      console.log('First question generated:', firstQuestion);
      console.log('Set interview_session cookie:', sessionId);

      return response;

    } catch (error) {
      console.error('Error generating first question:', error);
      return NextResponse.json({ 
        error: 'Failed to generate interview questions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 