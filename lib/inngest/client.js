import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "career-coach",
  name: "Career Coach",
  eventKey: process.env.INNGEST_EVENT_KEY,
  baseUrl: "http://localhost:3000/api/inngest",
  credentials: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
  },
});