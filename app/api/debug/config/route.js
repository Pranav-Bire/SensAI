import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check environment variables (mask actual values for security)
    const configStatus = {
      environment: process.env.NODE_ENV || 'unknown',
      gemini_api_key: process.env.GEMINI_API_KEY ? 'Configured ✓' : 'Missing ✗',
      google_credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Configured ✓' : 'Missing ✗',
      clerk_secret: process.env.CLERK_SECRET_KEY ? 'Configured ✓' : 'Missing ✗',
      clerk_publishable: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Configured ✓' : 'Missing ✗',
    };
    
    // Check Gemini API connectivity
    let geminiStatus = 'Untested';
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Respond with only the word 'connected' if you can read this message.");
        const response = await result.response;
        const text = response.text().toLowerCase();
        
        geminiStatus = text.includes('connected') ? 'Connected ✓' : 'Response Error ✗';
      } catch (error) {
        geminiStatus = `Error: ${error.message}`;
      }
    }
    
    // Check global interview sessions
    const sessionCount = Object.keys(global.interviewSessions || {}).length;
    
    return NextResponse.json({
      config: configStatus,
      api_status: {
        gemini: geminiStatus,
      },
      sessions: {
        count: sessionCount,
        ids: Object.keys(global.interviewSessions || {})
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Debug check failed', message: error.message },
      { status: 500 }
    );
  }
} 
 