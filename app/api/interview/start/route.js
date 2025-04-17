import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from "@clerk/nextjs/server";
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

export async function POST(request) {
  try {
    console.log('Starting interview API request');
    
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      console.log('Authentication failed: No userId');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get resume from request body
    let resumeText = '';
    let industry = 'Technology'; // Default industry
    let customQuestions = null; // Custom questions from resume analysis
    try {
      const body = await request.json();
      resumeText = body.resumeText || '';
      industry = body.industry || 'Technology';
      customQuestions = body.customQuestions || null;
      
      if (!industry) {
        console.log('Industry is required');
        return NextResponse.json({ 
          error: "Please select an industry" 
        }, { status: 400 });
      }
      
      // Log the received data
      console.log(`Resume text received, length: ${resumeText.length}, industry: ${industry}`);
      if (customQuestions) {
        console.log(`Using ${customQuestions.length} custom questions from resume analysis`);
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ 
        error: "Invalid request format" 
      }, { status: 400 });
    }
    
    // Generate session ID (in production, you would store sessions in Redis or a database)
    const sessionId = uuidv4();
    console.log('Generated session ID:', sessionId);
    
    let firstQuestion = '';
    
    try {
      // If we have custom questions from resume analysis, use the first one
      if (customQuestions && customQuestions.length > 0) {
        firstQuestion = customQuestions[0];
        console.log('Using first question from resume analysis:', firstQuestion);
      } else {
        // Otherwise, use Gemini to generate a question
        // Initialize Gemini model
        if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
          throw new Error('API key is not configured');
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log('Initialized Gemini model');
        
        // Using a simpler approach instead of chat session
        const generatePrompt = `
        You are an expert technical interviewer with years of experience in conducting ${industry} interviews.
        
        Resume Context:
        ${resumeText ? resumeText : "No resume provided"}
        
        Task:
        Generate a focused, professional interview question based on the candidate's resume. The question should:
        1. Directly reference specific experience, projects, or skills mentioned in their resume
        2. Be technical but clear and concise (max 2 sentences)
        3. Focus on real-world problem-solving and practical experience
        4. Avoid generic or theoretical questions
        5. Target senior-level technical depth
        
        Question Types to Generate:
        - Technical deep dives into projects mentioned
        - Problem-solving scenarios based on their tech stack
        - Architecture decisions they've made
        - Technical challenges they've overcome
        - System design based on their experience
        
        DO NOT:
        - Ask generic questions like "tell me about yourself"
        - Ask about soft skills or behavioral scenarios
        - Generate questions longer than 2 sentences
        - Ask questions not related to their resume
        
        Format: Return ONLY the question, nothing else.
        `;
        
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: generatePrompt }] }]
        });
        const response = await result.response;
        firstQuestion = response.text().trim();
        
        // Validate question length and quality
        if (firstQuestion.length > 150 || firstQuestion.toLowerCase().includes("tell me about") || !firstQuestion.includes("?")) {
          // Fallback to a more specific prompt if the first attempt isn't good enough
          const fallbackPrompt = `
          Based on this resume:
          ${resumeText.substring(0, 500)}
          
          Generate ONE specific technical question about their most recent project or technical skill.
          Must be under 100 characters and end with a question mark.
          Focus on technical depth, not soft skills.
          `;
          
          const fallbackResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: fallbackPrompt }] }]
          });
          firstQuestion = fallbackResult.response.text().trim();
        }
        
        console.log('First question generated:', firstQuestion);
      }
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      
      // If Gemini fails and we have custom questions, use the first one
      if (customQuestions && customQuestions.length > 0) {
        firstQuestion = customQuestions[0];
        console.log('Falling back to first custom question:', firstQuestion);
      } else {
        // Last resort fallback
        firstQuestion = "Could you tell me about your most recent project and the technologies you used?";
        console.log('Using fallback question:', firstQuestion);
      }
    }

    // Store the chat session in global object (you would use Redis or another DB in production)
    global.interviewSessions = global.interviewSessions || {};

    // Generate all questions if we have custom ones
    const allQuestions = customQuestions || [firstQuestion];

    global.interviewSessions[sessionId] = {
      questionCount: 1,
      questions: allQuestions,
      answers: [],
      resumeText: resumeText,
      industry: industry,
      userId: userId,
      createdAt: new Date().toISOString()
    };
    
    // Create the response with the session data
    const response = NextResponse.json({
      question: firstQuestion,
      sessionId: sessionId,
      success: true,
    });

    // Set the cookie in the response
    response.cookies.set('interview_session', sessionId, {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 30 // 30 minutes
    });

    console.log('Set interview_session cookie:', sessionId);
    return response;
  } catch (error) {
    console.error('Unhandled error in interview start API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start interview',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 