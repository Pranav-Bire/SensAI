import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req) {
  try {
    const { summary } = await req.json();

    const prompt = `
      Improve this professional summary to make it more impactful and professional:

      ${summary}

      Please enhance it by:
      1. Using strong action verbs
      2. Highlighting key achievements and skills
      3. Making it more concise and engaging
      4. Using industry-standard terminology
      5. Maintaining a professional tone

      Return only the improved summary text without any additional formatting or explanations.
    `;

    const result = await model.generateContent(prompt);
    const improvedSummary = result.response.text();

    return Response.json({ improvedSummary });
  } catch (error) {
    console.error("Error improving summary:", error);
    return Response.json({ error: "Failed to improve summary" }, { status: 500 });
  }
}
