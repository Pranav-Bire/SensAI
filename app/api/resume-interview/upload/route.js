import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DocxLoader } from "langchain/document_loaders/fs/docx";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const resume = formData.get("resume");
    const industry = formData.get("industry");

    if (!resume || !industry) {
      return NextResponse.json(
        { error: "Missing resume or industry" },
        { status: 400 }
      );
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
