# AI Career Coach 

A comprehensive AI-powered platform designed to assist users in their professional journey, from resume building to interview preparation and beyond.

![AI Career Coach](https://github.com/Pranav-Bire/SensAI/blob/95b7fb4bb4c43b979b44d61d51e558ca7f9dfcc6/public/logo.png)


##  Features

###  AI Resume Builder
- **Professional Resume Creation**: Generate polished resumes with customizable templates with suggestions and improvments from AI
- **Photo Upload**: Add a professional photo directly to your resume
- **Section Management**: Easily add, edit, and remove sections for experience, education, skills, and projects
- **Real-time Preview**: View changes as you make them
- **Export Options**: Download as PDF or Markdown

###  AI Cover Letter Generator
- **Personalized Cover Letters**: AI-generated cover letters tailored to specific job descriptions
- **Customization Options**: Edit and refine generated content
- **Multiple Versions**: Save and manage different cover letters for various applications
- **Professional Formatting**: Clean and modern layout for immediate use

###  Mock Interview Simulator
- **Industry-Specific Questions**: Practice with questions tailored to your field
- **Real-time Feedback**: Get instant analysis on your responses
- **Performance Tracking**: Monitor improvement over time
- **Interview Strategy Tips**: Learn best practices for common interview scenarios

###  Career Dashboard
- **Industry Trends**: Stay updated with trends of your interested industry including the upcoming skills required, salary slabs and job roles
- **Application Tracking**: Monitor your job application status
- **Progress Visualization**: Charts and metrics to track your career development
- **Personalized Recommendations**: AI-suggested improvements for your professional materials with suggestions and improvements from AI


##  Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **UI Components**: Radix UI, Lucide React icons
- **Backend**: Next.js API routes
- **Database**: Prisma with PostgreSQL
- **Authentication**: Clerk
- **AI Integration**: Google Generative AI
- **Form Handling**: React Hook Form with Zod validation
- **Markdown**: React MD Editor with rehype-raw
- **PDF Generation**: html2pdf.js
- **Styling**: Tailwind with class-variance-authority and tailwind-merge

##  Getting Started

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn
- PostgreSQL database

### Environment Setup
1. Clone the repository
   ```bash
   git clone https://github.com/Pranav-Bire/SensAI.git
   cd ai-career-coach
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/ai_career_coach"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   ```

4. Initialize the database
   ```bash
   npx prisma db push
   # or
   yarn prisma db push
   ```

5. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

##  Project Structure

```
ai-career-coach/
├── actions/           # Server actions for data operations
├── app/               # Next.js app directory
│   ├── (main)/        # Main authenticated routes
│   │   ├── ai-cover-letter/  # Cover letter generation
│   │   ├── dashboard/        # User dashboard
│   │   ├── interview/        # Mock interview simulator
│   │   ├── onboarding/       # User onboarding flow
│   │   └── resume/           # Resume builder
│   ├── api/          # API routes for AI integrations
│   └── lib/          # Shared libraries and utilities
├── components/       # Reusable UI components
├── data/             # Data models and sample data
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and configurations
├── prisma/           # Database schema and migrations
└── public/           # Static assets
```

##  Usage Examples

### Creating a Resume
1. Navigate to the Resume Builder
2. Fill in your personal information
3. Add sections for experience, education, skills, and projects
4. Preview your resume in real-time
5. Export as PDF or Markdown

### Generating a Cover Letter
1. Navigate to the AI Cover Letter Generator
2. Upload or paste a job description
3. Provide information about your experience
4. Generate a tailored cover letter
5. Edit and customize as needed
6. Export the final document

### Practicing for Interviews
1. Navigate to the Mock Interview Simulator
2. Select your industry and job role
3. Choose the type of interview (behavioral, technical, etc.)
4. Answer the prompted questions
5. Receive AI feedback on your responses
6. Review and track your performance



##  Acknowledgements
- [Next.js](https://nextjs.org) for the framework
- [Clerk](https://clerk.dev) for authentication
- [Google AI](https://ai.google.dev) for generative AI capabilities
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Radix UI](https://www.radix-ui.com) for accessible UI components

---


