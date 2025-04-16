import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

export async function POST(request) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Extract plain text based on file type
    let extractedText = '';
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // For plaintext files
      if (file.type === 'text/plain') {
        extractedText = buffer.toString('utf-8');
      }
      // For PDF and Word documents, use Gemini AI to extract text
      else if (file.type === 'application/pdf' || 
               file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               file.type === 'application/msword') {
        
        // Convert buffer to base64
        const base64Data = buffer.toString('base64');
        
        // Configure the prompt
        const prompt = `
          Extract all the text content from this resume document.
          Preserve the structure and formatting as much as possible.
          Include all sections such as:
          - Personal information
          - Education
          - Experience
          - Skills
          - Projects
          - Any other relevant sections
          
          Return ONLY the extracted text, without any additional comments or formatting.
        `;
        
        // For PDF and Word documents
        // Update to use the new model and content format
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Data
                  }
                }
              ]
            }
          ]
        });

        const response = await result.response;
        extractedText = response.text();
        
        if (!extractedText || extractedText.trim().length < 50) {
          console.error('Gemini API extraction returned insufficient content');
          throw new Error('Failed to extract meaningful content from document');
        }
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload a PDF, Word, or plain text file.' },
          { status: 400 }
        );
      }
      
      // Verify extraction was successful
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Failed to extract text from document');
      }
      
      return NextResponse.json({ text: extractedText });
    } catch (error) {
      console.error('Gemini API extraction failed:', error);
      
      // Return a specific error message
      return NextResponse.json(
        { 
          error: 'Failed to extract text from document',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Resume extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to process resume' },
      { status: 500 }
    );
  }
} 
 