'use client';

import React, { useState, useEffect } from 'react';
import { Building, MapPin, Calendar, ExternalLink, Bookmark, BookmarkCheck, Info, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Import tooltip components with error handling
let TooltipProvider, Tooltip, TooltipContent, TooltipTrigger;
let hasTooltips = false;

try {
  const tooltipModule = require('@/components/ui/tooltip');
  TooltipProvider = tooltipModule.TooltipProvider;
  Tooltip = tooltipModule.Tooltip;
  TooltipContent = tooltipModule.TooltipContent;
  TooltipTrigger = tooltipModule.TooltipTrigger;
  hasTooltips = true;
} catch (error) {
  console.warn('Tooltip components could not be loaded:', error);
  // Create dummy components as fallbacks
  TooltipProvider = ({ children }) => <>{children}</>;
  Tooltip = ({ children }) => <>{children}</>;
  TooltipContent = ({ children }) => <span className="hidden">{children}</span>;
  TooltipTrigger = ({ children }) => <>{children}</>;
  hasTooltips = false;
}

export default function JobCard({ job, isSaved, onSaveToggle }) {
  const [tooltipsAvailable, setTooltipsAvailable] = useState(hasTooltips);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  useEffect(() => {
    // Check if tooltips are available after mount
    setTooltipsAvailable(hasTooltips);
  }, []);
  
  const { 
    title, 
    company, 
    location, 
    date_posted, 
    description, 
    jobSkills = [], 
    matchPercentage = 0,
    commonSkills = [],
    url,
    isMockData,
    company_logo,
    highlights,
    salary,
    job_type
  } = job;

  // Get color based on match percentage
  const getMatchColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };
  
  // Get border color for the card based on match percentage
  const getCardBorderColor = (percentage) => {
    if (percentage >= 80) return 'border-green-200';
    if (percentage >= 50) return 'border-yellow-200';
    return 'border-red-200';
  };

  // Remove "(Demo)" from title if present
  const displayTitle = title ? title.replace(' (Demo)', '') : '';

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  // Get highlights from job data
  const getHighlights = () => {
    if (highlights && Array.isArray(highlights) && highlights.length > 0) {
      return highlights.reduce((acc, highlight) => {
        if (highlight.items && Array.isArray(highlight.items)) {
          return [...acc, ...highlight.items];
        }
        return acc;
      }, []).slice(0, 3);
    }
    return [];
  };

  const jobHighlights = getHighlights();
  const formattedDate = formatDate(date_posted);

  return (
    <Card className={`flex flex-col h-full transition-all hover:shadow-md ${getCardBorderColor(matchPercentage)}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            {company_logo && (
              <div className="h-8 w-8 mr-2 overflow-hidden rounded">
                <img 
                  src={company_logo} 
                  alt={`${company} logo`} 
                  className="h-full w-full object-contain"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
            <div>
              <CardTitle className="text-lg font-semibold line-clamp-2">{displayTitle}</CardTitle>
              {isMockData && tooltipsAvailable && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center">
                        <Info className="h-4 w-4 text-blue-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Sample job data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Static indicator only when tooltips don't work */}
              {isMockData && !tooltipsAvailable && (
                <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm ml-1">
                  Demo
                </span>
              )}
            </div>
          </div>
          <Badge className={getMatchColor(matchPercentage)}>
            {matchPercentage}% Match
          </Badge>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground mt-1">
          <MapPin className="h-3.5 w-3.5 mr-1" />
          <span className="line-clamp-1">{location}</span>
        </div>
        
        {formattedDate && (
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            <span>Posted: {formattedDate}</span>
          </div>
        )}
        
        {salary && salary !== 'Not specified' && (
          <div className="text-sm text-muted-foreground mt-1">
            Salary: <span className="font-medium">{salary}</span>
          </div>
        )}
        
        {job_type && (
          <div className="text-sm text-muted-foreground mt-1">
            Job Type: <span>{job_type}</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="py-2 flex-grow">
        <div className="space-y-3">
          <div>
            <p className={`text-sm ${showFullDescription ? '' : 'line-clamp-3'}`}>
              {description || "No description available"}
            </p>
            {description && description.length > 150 && (
              <button 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-xs text-primary hover:underline mt-1"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
          
          {jobHighlights.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Highlights:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                {jobHighlights.map((highlight, i) => (
                  <li key={i} className="line-clamp-1">{highlight}</li>
                ))}
              </ul>
            </div>
          )}
          
          {jobSkills?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium">Required Skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {jobSkills.map((skill, i) => (
                  <Badge 
                    key={i} 
                    variant={commonSkills?.includes(skill) ? "default" : "outline"}
                    className="text-xs"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
              
              {/* Missing skills section */}
              {job.missingSkills && job.missingSkills.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Skills to Learn:</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {job.missingSkills.slice(0, 3).map((skill, i) => (
                      <Badge 
                        key={i} 
                        variant="outline"
                        className="text-xs text-blue-600 border-blue-200 bg-blue-50"
                      >
                        + Learn {skill}
                      </Badge>
                    ))}
                    {job.missingSkills.length > 3 && (
                      <Badge 
                        variant="outline"
                        className="text-xs text-muted-foreground"
                      >
                        +{job.missingSkills.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onSaveToggle(job)}
          className={`text-muted-foreground hover:text-primary ${isSaved ? 'text-primary' : ''}`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="h-4 w-4 mr-1 text-primary" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 mr-1" />
              Save
            </>
          )}
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              View
            </a>
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            asChild
          >
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
              Apply
            </a>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 