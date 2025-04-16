"use client";

import { useState } from "react";
import { 
  PieChart, ChartArea, BarChart3, Lightbulb, 
  ListChecks, CheckCircle2, XCircle, AlertCircle, 
  ChevronDown, ChevronUp, Download, Share
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function ATSScoreCard({ analysis, industry }) {
  const [expanded, setExpanded] = useState(false);

  if (!analysis) return null;
  
  // Ensure all required properties exist with defaults
  const { 
    atsScore = 0, 
    keywordMatch = 0, 
    feedback = "No feedback available", 
    missingKeywords = [], 
    detectedKeywords = [],
    improvementTips = [],
    resumeStructure = [],
    strengthsAndWeaknesses = { strengths: [], weaknesses: [] }
  } = analysis;
  
  // Default tips in case API doesn't return any
  const defaultTips = [
    `Include more ${industry || 'industry'}-specific keywords to improve ATS score`,
    "Quantify your achievements with specific metrics and numbers",
    "Use action verbs at the beginning of your bullet points",
    "Ensure your resume has a clear, consistent structure",
    "Include a strong professional summary that highlights your key skills"
  ];

  // Default strengths and weaknesses
  const defaultStrengths = [
    "Professional formatting",
    "Includes contact information"
  ];
  
  const defaultWeaknesses = [
    `Could include more ${industry || 'industry'}-specific keywords`,
    "Experience section could benefit from more quantified achievements",
    "Consider adding more technical skills relevant to the industry"
  ];
  
  // Use defaults if arrays are empty
  const displayTips = improvementTips.length > 0 ? improvementTips : defaultTips;
  const displayStrengths = strengthsAndWeaknesses.strengths.length > 0 
    ? strengthsAndWeaknesses.strengths 
    : defaultStrengths;
  const displayWeaknesses = strengthsAndWeaknesses.weaknesses.length > 0 
    ? strengthsAndWeaknesses.weaknesses 
    : defaultWeaknesses;
  
  // Format score as percentage with no decimals
  const formattedScore = Math.round(atsScore);
  
  // Determine score color
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };
  
  // Determine score text
  const getScoreText = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    return "Needs Improvement";
  };

  // Format progress color
  const getProgressColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Format structure items with icons
  const formatStructureItem = (item) => {
    if (item.status === "present") {
      return (
        <div className="flex items-start space-x-2" key={item.name}>
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-start space-x-2" key={item.name}>
          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>
      );
    }
  };

  // Default structure items if empty
  const defaultStructureItems = [
    {
      name: "Contact Information",
      status: "present",
      description: "Essential for recruiters to reach you"
    },
    {
      name: "Professional Summary",
      status: "present",
      description: "Provides a quick overview of your qualifications"
    },
    {
      name: "Skills Section",
      status: resumeStructure.length === 0 ? "missing" : "present",
      description: "Highlights key abilities and technologies you've mastered"
    },
    {
      name: "Work Experience",
      status: resumeStructure.length === 0 ? "missing" : "present",
      description: "Shows your professional history and achievements"
    }
  ];

  // Use default structure if none provided
  const displayStructure = resumeStructure.length > 0 ? resumeStructure : defaultStructureItems;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">ATS Score Analysis</CardTitle>
            <CardDescription>
              How well your resume performs against Applicant Tracking Systems
            </CardDescription>
          </div>
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-24 h-24">
              <svg className="w-24 h-24" viewBox="0 0 100 100">
                <circle
                  className="text-muted-foreground/20"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="38"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={`${getProgressColor(formattedScore)} transition-all duration-300 ease-in-out`}
                  strokeWidth="8"
                  strokeDasharray={`${formattedScore * 2.4} 1000`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="38"
                  cx="50"
                  cy="50"
                />
              </svg>
              <span className={`absolute text-2xl font-bold ${getScoreColor(formattedScore)}`}>
                {formattedScore}%
              </span>
            </div>
            <p className={`font-medium mt-2 ${getScoreColor(formattedScore)}`}>
              {getScoreText(formattedScore)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="tips">Improvement Tips</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <PieChart className="mr-2 h-4 w-4" />
                Overall Assessment
              </h3>
              <p className="text-sm text-muted-foreground">{feedback}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                Keyword Match
              </h3>
              <div className="flex items-center space-x-4">
                <Progress value={keywordMatch} className="h-2 flex-1" />
                <span className="text-sm font-medium">{keywordMatch}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {keywordMatch >= 70 
                  ? "Great keyword usage for your target industry!" 
                  : `Consider adding more ${industry || 'industry'}-related keywords.`}
              </p>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="structure">
                <AccordionTrigger className="text-sm font-medium py-2">
                  <div className="flex items-center">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Resume Structure
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {displayStructure.map(formatStructureItem)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          
          <TabsContent value="keywords" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                Detected Industry Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {detectedKeywords.length > 0 ? (
                  detectedKeywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="bg-green-100 text-green-800">
                      {keyword}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No specific industry keywords detected.</p>
                )}
              </div>
            </div>
            
            {missingKeywords.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-3 flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
                  Recommended Keywords to Add
                </h3>
                <div className="flex flex-wrap gap-2">
                  {missingKeywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="border-yellow-500 text-yellow-500">
                      + {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="tips" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" />
                Personalized Improvement Tips
              </h3>
              <ul className="space-y-2">
                {displayTips.map((tip, index) => {
                  // Remove any leading dashes or bullet points if they exist
                  const cleanTip = typeof tip === 'string' ? tip.replace(/^[-•*]\s*/, '') : tip;
                  return (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
                        <ChartArea className="h-3 w-3" />
                      </div>
                      <p className="text-sm">{cleanTip}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
            
            <div className="pt-2">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <ListChecks className="mr-2 h-4 w-4" />
                Strengths & Weaknesses
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-green-500 mb-1 flex items-center">
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Strengths
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    {displayStrengths.map((strength, index) => {
                      // Remove any leading dashes or bullet points if they exist
                      const cleanStrength = typeof strength === 'string' ? strength.replace(/^[-•*]\s*/, '') : strength;
                      return (
                        <li key={index} className="text-sm text-muted-foreground">{cleanStrength}</li>
                      );
                    })}
                  </ul>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-red-500 mb-1 flex items-center">
                    <XCircle className="mr-1.5 h-4 w-4" /> Areas to Improve
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    {displayWeaknesses.map((weakness, index) => {
                      // Remove any leading dashes or bullet points if they exist
                      const cleanWeakness = typeof weakness === 'string' ? weakness.replace(/^[-•*]\s*/, '') : weakness;
                      return (
                        <li key={index} className="text-sm text-muted-foreground">{cleanWeakness}</li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <Button variant="outline" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Show More
            </>
          )}
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Save Report
          </Button>
          <Button variant="outline" size="sm">
            <Share className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 