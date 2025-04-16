import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from "@clerk/nextjs/server";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize Speech to Text client - defer initialization to avoid server-side errors
let speechClient = null;
let isSpeechClientInitializing = false;

const initSpeechClient = async () => {
  if (speechClient || isSpeechClientInitializing) return;
  
  isSpeechClientInitializing = true;
  try {
    // Dynamically import the client to avoid issues in Edge runtime
    const { SpeechClient } = await import('@google-cloud/speech');
    
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}');
    if (credentials && Object.keys(credentials).length > 0) {
      speechClient = new SpeechClient({ credentials });
      console.log('Speech client initialized successfully');
    } else {
      console.warn('No valid credentials found for Speech-to-Text');
    }
  } catch (error) {
    console.warn('Failed to initialize Speech client:', error.message);
    // Will use fallback mock transcription
  } finally {
    isSpeechClientInitializing = false;
  }
};

// Mock transcriptions for development when Speech-to-Text is not available
const mockTranscriptions = [
  "I have experience working with React and Node.js for about 3 years. I've built several full-stack applications and enjoy solving complex frontend challenges.",
  "My strongest technical skill is probably JavaScript and its ecosystem. I'm comfortable with modern frameworks and have experience with state management solutions like Redux and Context API.",
  "One challenging project I worked on involved migrating a legacy system to a modern stack. We faced issues with data migration but successfully implemented a phased approach.",
  "I typically approach problem-solving by first understanding the requirements, breaking down the problem, and then implementing a solution iteratively while testing along the way.",
  "I'm most proud of a project where I implemented real-time collaboration features. It required understanding WebSockets and handling concurrent edits efficiently.",
  "I stay updated with industry trends through online courses, technical blogs, and participating in developer communities. I recently completed a course on cloud architecture.",
  "My career goal is to grow into a technical leadership role where I can mentor others while still maintaining hands-on development work."
];

// Mock interview questions in case Gemini API fails
const mockQuestions = [
  "Tell me about your experience with web development technologies.",
  "What would you consider your strongest technical skill? Why?",
  "Can you describe a challenging project you worked on and how you overcame obstacles?",
  "How do you typically approach problem-solving in your development work?",
  "Which project or achievement are you most proud of, and why?",
  "How do you stay updated with new technologies and industry trends?",
  "Where do you see your career heading in the next few years?"
];

export async function POST(request) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const liveTranscript = formData.get('liveTranscript');
    const sessionId = formData.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: "No session ID provided" }, { status: 400 });
    }

    // Get session data
    const session = global.interviewSessions?.[sessionId];
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // Use live transcript as the answer text
    const transcription = liveTranscript || "No transcription available";
    
    // Store the answer
    session.answers.push(transcription);

    try {
      // Generate analysis prompt
      const analysisPrompt = `You are an expert technical interviewer analyzing a candidate's response.

Question Asked: ${session.questions[session.questionCount - 1]}

Candidate's Answer: ${transcription}

Resume Context: ${session.resumeText}

Analyze this response considering the candidate's resume and provide a structured evaluation.

IMPORTANT: Return a valid JSON object with NO markdown formatting, NO code blocks, and NO backticks.
The JSON should have these fields:
{
  "technicalAccuracy": 7,
  "problemSolving": 7,
  "communicationClarity": 7,
  "keyStrength": "One specific technical strength from their answer",
  "technicalImprovement": "One specific technical aspect they should improve",
  "confidence": 7,
  "relevanceToResume": "How well the answer aligns with their stated experience"
}

Scores should be between 1-10. Be objective and fair in scoring.`;

      const analysisResult = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: analysisPrompt }] }]
      });
      
      const rawAnalysisText = analysisResult.response.text();
      let analysisText = rawAnalysisText;
      let analysis;
      
      try {
        // Step 1: Try to extract JSON from markdown code blocks if present
        const jsonMatch = rawAnalysisText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          analysisText = jsonMatch[1];
        } else {
          // Step 2: Remove any markdown formatting that might be present
          analysisText = rawAnalysisText
            .replace(/```json|```/g, '')  // Remove code block markers
            .replace(/^[^{]*/, '')        // Remove any text before the first {
            .replace(/[^}]*$/, '')        // Remove any text after the last }
            .trim();
        }
        
        // Log the cleaned JSON for debugging
        console.log("Cleaned JSON:", analysisText.substring(0, 100) + "...");
        
        // Step 3: Parse the JSON
        analysis = JSON.parse(analysisText);
        
        // Store the analysis in a more structured way
        session.answerAnalyses = session.answerAnalyses || [];
        session.answerAnalyses.push({
          question: session.questions[session.questionCount - 1],
          answer: transcription,
          scores: {
            technical: analysis.technicalAccuracy,
            problemSolving: analysis.problemSolving,
            clarity: analysis.communicationClarity,
            confidence: analysis.confidence
          },
          strength: analysis.keyStrength,
          improvement: analysis.technicalImprovement,
          relevanceToResume: analysis.relevanceToResume
        });
      } catch (parseError) {
        console.error('Error parsing analysis:', parseError);
        console.error('Raw response:', rawAnalysisText.substring(0, 200));
        
        // Create a fallback analysis
        analysis = {
          technicalAccuracy: 7,
          problemSolving: 7,
          communicationClarity: 7,
          confidence: 7,
          keyStrength: "Demonstrated basic technical knowledge",
          technicalImprovement: "Could provide more specific implementation details",
          relevanceToResume: "Partially aligned with stated experience"
        };
        
        // Still store the analysis even if parsing failed
        session.answerAnalyses = session.answerAnalyses || [];
        session.answerAnalyses.push({
          question: session.questions[session.questionCount - 1],
          answer: transcription,
          scores: {
            technical: analysis.technicalAccuracy,
            problemSolving: analysis.problemSolving,
            clarity: analysis.communicationClarity,
            confidence: analysis.confidence
          },
          strength: analysis.keyStrength,
          improvement: analysis.technicalImprovement,
          relevanceToResume: analysis.relevanceToResume
        });
      }

      // Check if this is the final question
      if (session.questionCount >= 7) {
        // Generate final comprehensive report
        const reportPrompt = `You are conducting a final evaluation of a technical interview.

Interview Summary:
${session.questions.map((q, i) => `
Question ${i + 1}: ${q}
Candidate's Answer: ${session.answers[i]}
Technical Score: ${session.answerAnalyses[i]?.scores?.technical}/10
Problem-Solving: ${session.answerAnalyses[i]?.scores?.problemSolving}/10
Confidence: ${session.answerAnalyses[i]?.scores?.confidence}/10
Key Strength: ${session.answerAnalyses[i]?.strength}
`).join('\n')}

Resume Context: ${session.resumeText}

IMPORTANT: Return a valid JSON object with NO markdown formatting, NO code blocks, and NO backticks.
The JSON should have this exact structure:
{
  "overallAssessment": "Detailed overall performance assessment",
  "technicalStrengths": ["List 3-4 specific technical strengths demonstrated"],
  "technicalWeaknesses": ["List 3-4 specific areas needing improvement"],
  "communicationSkills": "Assessment of communication effectiveness",
  "recommendedResources": ["3-4 specific learning resources or areas to focus on"],
  "nextSteps": ["3-4 actionable steps for improvement"],
  "questionByQuestion": [{
    "questionNumber": 1,
    "question": "Question text",
    "answer": "Candidate's answer",
    "feedback": "Specific feedback for this answer",
    "score": 7
  }]
}`;

        const reportResult = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: reportPrompt }] }]
        });
        
        const rawReportText = reportResult.response.text();
        let report;
        try {
          // Extract JSON using the same approach as for analysis
          let reportText = rawReportText;
          const jsonMatch = rawReportText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            reportText = jsonMatch[1];
          } else {
            reportText = rawReportText
              .replace(/```json|```/g, '')
              .replace(/^[^{]*/, '')
              .replace(/[^}]*$/, '')
              .trim();
          }
          
          report = JSON.parse(reportText);
        } catch (error) {
          console.error('Error parsing report:', error);
          console.error('Raw report:', rawReportText.substring(0, 200));
          
          report = {
            overallAssessment: "Technical evaluation could not be generated",
            technicalStrengths: ["Technical strengths analysis unavailable"],
            technicalWeaknesses: ["Technical improvements analysis unavailable"],
            recommendedResources: ["Learning recommendations unavailable"],
            nextSteps: ["Please try the interview again"],
            questionByQuestion: session.questions.map((q, i) => ({
              questionNumber: i + 1,
              question: q,
              answer: session.answers[i] || "No answer recorded",
              feedback: "Analysis unavailable",
              score: 7
            }))
          };
        }

        return NextResponse.json({
          isComplete: true,
          report,
          analysis,
          success: true
        });
      }

      // Generate next question based on resume and previous answers
      const nextQuestionPrompt = `You are an expert technical interviewer conducting an interview.

Resume Context: ${session.resumeText}

Previous Questions and Answers:
${session.questions.map((q, i) => `
Q${i + 1}: ${q}
A: ${session.answers[i] || "No answer recorded"}
`).join('\n')}

Generate the next interview question that:
1. Is directly related to the candidate's resume and experience
2. Builds naturally from previous questions and answers
3. Is clear and concise (max 2 sentences)
4. Is at an appropriate difficulty level (not too complex)
5. Focuses on practical experience and problem-solving
6. Avoids overly theoretical or abstract concepts

The question should be specific to their background but easy to understand.
Return ONLY the question text, nothing else.`;

      const nextQuestionResult = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: nextQuestionPrompt }] }]
      });

      const nextQuestion = nextQuestionResult.response.text().trim();
      session.questions.push(nextQuestion);
      session.questionCount++;

      return NextResponse.json({
        isComplete: false,
        nextQuestion,
        analysis,
        transcription,
        success: true
      });

    } catch (error) {
      console.error('Error in interview processing:', error);
      return NextResponse.json({ 
        error: 'Failed to process interview response',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions to check question similarity and extract topics
function similarityCheck(question1, question2) {
  // Simple similarity check based on common words
  const words1 = question1.toLowerCase().split(/\W+/);
  const words2 = question2.toLowerCase().split(/\W+/);
  
  const common = words1.filter(word => 
    words2.includes(word) && word.length > 3
  );
  
  return common.length / Math.min(words1.length, words2.length);
}

function extractTopic(question) {
  // Simple topic extraction - get the key nouns and verbs
  const words = question.toLowerCase().split(/\W+/);
  const stopWords = ['what', 'why', 'how', 'when', 'where', 'which', 'would', 'could', 'should', 'have', 'has', 'had', 'the', 'and', 'for', 'did', 'your'];
  return words
    .filter(word => !stopWords.includes(word) && word.length > 3)
    .slice(0, 3)
    .join(' ');
}

// Function to create a fallback report when API fails
function createFallbackReport(session) {
  // Create a simple analysis of answers to generate personalized fallback
  const answerLengths = session.answers.map(a => a?.length || 0);
  const avgAnswerLength = answerLengths.reduce((a, b) => a + b, 0) / answerLengths.length;
  
  // Extract key terms from answers for basic personalization
  const allAnswersText = session.answers.join(' ').toLowerCase();
  const techTerms = ['javascript', 'python', 'react', 'node', 'aws', 'cloud', 'database', 'sql', 'nosql', 'frontend', 'backend', 'fullstack', 'agile', 'scrum', 'devops', 'ci/cd', 'microservices', 'architecture'];
  const mentionedTechs = techTerms.filter(term => allAnswersText.includes(term));
  
  return {
    overallPerformance: `The candidate demonstrated ${avgAnswerLength > 200 ? 'detailed' : 'concise'} communication skills and provided ${mentionedTechs.length > 2 ? 'technical depth' : 'general knowledge'} across interview questions. ${mentionedTechs.length > 0 ? `Their knowledge of ${mentionedTechs.slice(0, 3).join(', ')} was particularly evident.` : ''}`,
    strengths: [
      `Provided ${avgAnswerLength > 200 ? 'comprehensive' : 'concise'} responses to technical questions`,
      mentionedTechs.length > 0 ? `Demonstrated familiarity with ${mentionedTechs.slice(0, 2).join(' and ')}` : "Showed willingness to engage with technical questions",
      answerLengths.every(l => l > 50) ? "Consistently provided substantial answers to all questions" : "Provided detailed answers to several key questions",
      "Engaged thoughtfully with the interview format"
    ],
    improvements: [
      answerLengths.some(l => l < 100) ? "Could provide more detailed answers to some questions" : "Could focus on being more concise in some responses",
      "Consider providing more specific examples from past work",
      "More emphasis on technical implementation details would strengthen responses",
      "Could better highlight problem-solving approach in technical scenarios"
    ],
    tips: [
      "Prepare specific examples from past projects that showcase technical skills",
      `Highlight experience with ${mentionedTechs.length > 0 ? mentionedTechs.join(', ') : 'relevant technologies'} more prominently`,
      "Practice the STAR method (Situation, Task, Action, Result) for behavioral questions",
      "Balance technical details with business impact when describing projects",
      "Prepare concise explanations of your problem-solving methodology"
    ]
  };
} 
 