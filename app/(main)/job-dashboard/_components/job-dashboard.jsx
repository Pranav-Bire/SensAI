'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, MapPin, Building, Calendar, ExternalLink, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchJobs, isUsingMockData } from '@/lib/services/jobService';
import { saveJobToFavorites, removeJobFromFavorites } from '@/actions/jobs';
import JobCard from './job-card';

const JOBS_PER_PAGE = 9;

const JobDashboard = ({ userSkills = [], savedJobs = [] }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [favoriteJobs, setFavoriteJobs] = useState(savedJobs);
  const [activeTab, setActiveTab] = useState('all');
  const [usingMockData, setUsingMockData] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const { toast } = useToast();

  // Fetch jobs using our service
  const loadJobs = async (page = 1) => {
    setLoading(true);
    try {
      let location = locationFilter;
      // If India is selected as country filter, append it to location
      if (countryFilter === 'in' && !locationFilter.toLowerCase().includes('india')) {
        location = locationFilter ? `${locationFilter}, India` : 'India';
      }
      
      const { jobs: jobData, totalJobs: total } = await fetchJobs(searchQuery, location, userSkills, page, JOBS_PER_PAGE);
      setJobs(jobData);
      setTotalJobs(total);
      setUsingMockData(isUsingMockData());
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch jobs. Please try again later.',
        variant: 'destructive'
      });
      // Set empty array on error
      setJobs([]);
      setTotalJobs(0);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadJobs(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalJobs / JOBS_PER_PAGE);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total pages is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate start and end of page range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust range if at the start or end
      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }
      
      // Add ellipsis if needed
      if (start > 2) {
        pages.push('...');
      }
      
      // Add pages in range
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Handle saving a job to favorites
  const handleSaveJob = async (job) => {
    try {
      // Check if already in favorites
      const isAlreadySaved = favoriteJobs.some(fav => fav.url === job.url);
      
      if (isAlreadySaved) {
        // Remove from favorites in DB
        await removeJobFromFavorites(job.url);
        
        // Update local state
        const updatedFavorites = favoriteJobs.filter(fav => fav.url !== job.url);
        setFavoriteJobs(updatedFavorites);
        
        toast({
          title: 'Job Removed',
          description: 'Job removed from your favorites',
        });
      } else {
        // Add to favorites in DB
        await saveJobToFavorites(job);
        
        // Update local state
        setFavoriteJobs([...favoriteJobs, job]);
        
        toast({
          title: 'Job Saved',
          description: 'Job saved to your favorites',
        });
      }
    } catch (error) {
      console.error('Error saving/removing job:', error);
      toast({
        title: 'Error',
        description: 'There was an error saving this job. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Filter jobs based on search query and location
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => 
      (searchQuery === '' || 
       job.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       job.company?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (locationFilter === '' || 
       job.location?.toLowerCase().includes(locationFilter.toLowerCase()))
    );
  }, [jobs, searchQuery, locationFilter]);

  // Sort jobs by match percentage (high to low)
  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [filteredJobs]);

  // Get displayed jobs based on active tab
  const displayedJobs = useMemo(() => {
    if (activeTab === 'favorites') {
      return favoriteJobs;
    }
    return sortedJobs;
  }, [activeTab, sortedJobs, favoriteJobs]);

  // Check if a job is saved to favorites
  const isJobSaved = (job) => {
    return favoriteJobs.some(fav => fav.url === job.url);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">All Jobs</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="search" className="block text-sm font-medium mb-1">
                Search Jobs
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by job title or company..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Filter by location..."
                  className="pl-8"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div className="text-sm font-medium">Country:</div>
            <Badge 
              variant={countryFilter === '' ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCountryFilter('')}
            >
              Any
            </Badge>
            <Badge 
              variant={countryFilter === 'us' ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCountryFilter('us')}
            >
              USA
            </Badge>
            <Badge 
              variant={countryFilter === 'in' ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCountryFilter('in')}
            >
              India
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
            </p>
            <Button onClick={() => loadJobs(currentPage)} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </>
              ) : (
                'Refresh Jobs'
              )}
            </Button>
          </div>
          
          {renderJobList(loading, displayedJobs)}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {getPageNumbers().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-2">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      disabled={loading}
                    >
                      {page}
                    </Button>
                  )}
                </React.Fragment>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="favorites" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {favoriteJobs.length} saved job{favoriteJobs.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {favoriteJobs.length === 0 ? (
            <div className="text-center py-16 border rounded-lg bg-muted/30">
              <h3 className="text-lg font-medium">No saved jobs</h3>
              <p className="text-muted-foreground mt-1">
                Save jobs you're interested in to view them here.
              </p>
            </div>
          ) : (
            renderJobList(false, favoriteJobs)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
  
  // Helper function to render job cards
  function renderJobList(isLoading, jobsList) {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    } 
    
    if (jobsList.length === 0) {
      return (
        <div className="text-center py-16 border rounded-lg bg-muted/30">
          <h3 className="text-lg font-medium">No jobs found</h3>
          <p className="text-muted-foreground mt-1">
            Try changing your search criteria or refresh to see more jobs.
          </p>
        </div>
      );
    }
    
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobsList.map((job, index) => (
          <JobCard 
            key={job.id || index} 
            job={job} 
            isSaved={isJobSaved(job)}
            onSaveToggle={handleSaveJob}
          />
        ))}
      </div>
    );
  }
};
