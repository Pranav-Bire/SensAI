import React from 'react';
import JobDashboard from './_components/job-dashboard';
import { getUser } from '@/actions/user';
import { getSavedJobs } from '@/actions/jobs';

export default async function JobDashboardPage() {
  const user = await getUser();
  const savedJobs = await getSavedJobs();
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Job Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Find job opportunities that match your skills and experience. We'll help you identify the perfect roles 
        and highlight areas where you can grow to become an even stronger candidate.
      </p>
      <JobDashboard userSkills={user?.skills || []} savedJobs={savedJobs} />
    </div>
  );
} 