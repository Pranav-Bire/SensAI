import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResumeInterview from './_components/resume-interview';
import { getUser } from '@/actions/user';

export default async function ResumeInterviewPage() {
  const user = await getUser();
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Resume Interview</h1>
      <p className="text-muted-foreground mb-8">
        Practice your interview skills with our AI-powered interview simulator.
      </p>
      
      <div className="space-y-6">
        <ResumeInterview userResume={user?.resume} />
      </div>
    </div>
  );
} 