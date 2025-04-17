'use client';

import { useEffect, useState } from "react";
import { fetchJobs, isUsingMockData } from "@/lib/services/jobService";
// import JobList from "@/components/jobs/JobList";
// import JobFilters from "@/components/jobs/JobFilters";
import { AlertCircle } from "lucide-react";

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    query: "",
    location: "",
    page: 1,
    limit: 10
  });

  useEffect(() => {
    loadJobs();
  }, [filters]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const jobsData = await fetchJobs(
        filters.query,
        filters.location,
        filters.page,
        filters.limit
      );
      setJobs(jobsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page when filters change
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job Search</h1>
        {isUsingMockData() && (
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Using demo data</span>
          </div>
        )}
      </div>

      <JobFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <JobList
        jobs={jobs}
        loading={loading}
        onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
        currentPage={filters.page}
      />
    </div>
  );
} 