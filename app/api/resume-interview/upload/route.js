import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { getGeneralIndustryList } from '@/lib/data/industryList';

// Initialize Gemini AI with the API key
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
    const industryValue = formData.get('industry');
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!industryValue) {
      return NextResponse.json({ error: 'Industry not specified' }, { status: 400 });
    }

    // Extract text content from the file
    let resumeText = '';
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // For plaintext files
      if (file.type === 'text/plain') {
        resumeText = buffer.toString('utf-8');
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
        resumeText = response.text();
        
        if (!resumeText || resumeText.trim().length < 50) {
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
      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error('Failed to extract text from document');
      }
      
      // Check if the industry is valid
      const industries = getGeneralIndustryList();
      const isValidIndustry = industries.some(industry => 
        industry.value === industryValue || industry.label === industryValue
      );
      
      if (!isValidIndustry) {
        return NextResponse.json(
          { error: 'Invalid industry selected' },
          { status: 400 }
        );
      }
      
      // Return the extracted text and the selected industry
      return NextResponse.json({
        text: resumeText,
        industry: industryValue
      });
      
    } catch (error) {
      console.error('Resume text extraction error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to extract text from document',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process resume upload' },
      { status: 500 }
    );
  }
    }

    // Convert file to buffer
    const buffer = Buffer.from(await resume.arrayBuffer());
    
    // Parse resume based on file type
    let resumeText = "";
    if (resume.type.includes("pdf")) {
      const loader = new PDFLoader(buffer);
      const docs = await loader.load();
      resumeText = docs.map(doc => doc.pageContent).join(" ");
    } else {
      const loader = new DocxLoader(buffer);
      const docs = await loader.load();
      resumeText = docs.map(doc => doc.pageContent).join(" ");
    }

    // Use Gemini to analyze resume
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
    Analyze this resume text and extract:
    1) Skills
    2) Project Summaries
    3) Experiences
    4) Tech Stack

    Resume text:
    ${resumeText}
    `;

    const result = await model.generateContent(prompt);
    const resumeAnalysis = result.response.text();

    // Generate interview questions
    const questionPrompt = `
    Based on this resume analysis and the industry (${industry}), generate 5 interview questions.
    Mix technical and behavioral questions. Make them relevant to the candidate's experience.
    Format as a JSON array of strings.

    Resume Analysis:
    ${resumeAnalysis}
    `;

    const questionsResult = await model.generateContent(questionPrompt);
    const questions = JSON.parse(questionsResult.response.text());

    return NextResponse.json({
      questions,
      analysis: resumeAnalysis
    });
  } catch (error) {
    console.error("Resume processing error:", error);
    return NextResponse.json(
      { error: "Failed to process resume" },
      { status: 500 }
    );
  }
}
