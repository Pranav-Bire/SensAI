"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {  AlertTriangle,  Download,  Edit,  Loader2,  Monitor,  Save, Upload, Sparkles, FileUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import rehypeRaw from "rehype-raw";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume } from "@/actions/resume";
import { EntryForm } from "./entry-form";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";
import { Wand2 } from "lucide-react";
import { improveWithAI } from "@/actions/resume";
import PhotoUpload from "./photo-upload";
import ResumeUpload from "./resume-upload";
import ATSScoreCard from "./ats-score-card";

export default function ResumeBuilder({ initialContent, initialAtsScore, initialFeedback }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent);
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");
  // Always start with no ATS analysis - only set when explicitly requested through upload
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  
  // Clear ATS analysis when component is unmounted or page is refreshed
  useEffect(() => {
    // Always start with a clean slate - no ATS analysis until explicitly requested
    setAtsAnalysis(null);
    
    return () => {
      setAtsAnalysis(null);
    };
  }, []);
  const [industry, setIndustry] = useState("");

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {
        email: "",
        mobile: "",
        linkedin: "",
        twitter: "",
        photo: "",
      },
      summary: "",
      skills: "",
      experience: [],
      education: [],
      projects: [],
    },
  });

  // Fetch user data to get industry
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch("/api/user");
        const data = await response.json();
        if (data.industry) {
          setIndustry(data.industry);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
    
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  const {
    loading: isImproving,
    fn: improveWithAIFn,
    data: improvedContent,
    error: improveError,
  } = useFetch(improveWithAI);

  // Handle AI improvement results
  useEffect(() => {
    if (improvedContent && !isImproving) {
      setValue("summary", improvedContent);
      toast.success("Summary improved successfully!");
    }
    if (improveError) {
      toast.error(improveError.message || "Failed to improve summary");
    }
  }, [improvedContent, improveError, isImproving, setValue]);

  // Watch form fields for preview updates
  const formValues = watch();

  useEffect(() => {
    if (initialContent) setActiveTab("preview");
  }, [initialContent]);

  // Update preview content when form values change
  useEffect(() => {
    if (activeTab === "edit") {
      const newContent = getCombinedContent();
      if (newContent) {
        setPreviewContent(newContent);
      } else if (initialContent && !previewContent) {
        setPreviewContent(initialContent);
      }
    }
  }, [formValues, activeTab]);

  // Handle save result
  useEffect(() => {
    if (saveResult && !isSaving) {
      toast.success("Resume saved successfully!");
    }
    if (saveError) {
      toast.error(saveError.message || "Failed to save resume");
    }
  }, [saveResult, saveError, isSaving]);

  const getContactMarkdown = () => {
    const { contactInfo } = formValues;
    const parts = [];

    // Safely get user's name or use a placeholder
    const userName = user?.fullName || "Your Name";

    // Format photo with centered name and right-aligned photo
    const photoSection = contactInfo.photo 
      ? `<div style="position: relative; width: 100%; margin: 24px 0;">
<div style="text-align: center; padding-top: 24px;">
<h1 style="font-size: 2.5rem; font-weight: bold; margin: 0;">${userName}</h1>
</div>
<div style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); padding: 8px 20px 0 0;">
<img src="${contactInfo.photo}" alt="Profile Photo" width="80" height="80" style="border-radius: 50%; object-fit: cover;" />
</div>
</div>`
      : `<h1 style="font-size: 2.5rem; font-weight: bold; text-align: center; margin: 24px 0; padding-top: 24px;">${userName}</h1>`;

    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo.mobile) parts.push(`📱 ${contactInfo.mobile}`);
    if (contactInfo.linkedin)
      parts.push(`💼 [LinkedIn](${contactInfo.linkedin})`);
    if (contactInfo.twitter) parts.push(`🐦 [Twitter](${contactInfo.twitter})`);

    return `${photoSection}
<div align="center">\n\n${parts.join(" | ")}\n\n</div>`;
  };

  const getCombinedContent = () => {
    try {
    const { summary, skills, experience, education, projects } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n");
    } catch (error) {
      console.error("Error generating content:", error);
      return "";
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Dynamically import html2pdf to ensure it only runs on the client
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = document.getElementById("resume-pdf");
      const opt = {
        margin: [15, 15],
        filename: "resume.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formattedContent = previewContent
        .replace(/\n/g, "\n") // Normalize newlines
        .replace(/\n\s*\n/g, "\n\n") // Normalize multiple newlines to double newlines
        .trim();

      await saveResumeFn(formattedContent, atsAnalysis?.atsScore, atsAnalysis?.feedback);
      toast.success("Resume saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save resume: " + (error.message || "Unknown error"));
    }
  };

  const handleImproveSummary = async () => {
    const summary = watch("summary");
    if (!summary) {
      toast.error("Please enter a summary first");
      return;
    }

    await improveWithAIFn({
      current: summary,
      type: "summary",
    });
  };

  // Handle uploaded resume analysis results
  const handleResumeAnalysis = (analysis) => {
    setAtsAnalysis(analysis);
    
    // If the analysis includes extracted content, update the form
    if (analysis.extractedContent) {
      setPreviewContent(analysis.extractedContent);
      
      // Try to extract data from the analysis to fill the form
      if (analysis.extractedData) {
        const { summary, skills, contactInfo, experience, education, projects } = analysis.extractedData;
        
        if (summary) setValue("summary", summary);
        if (skills) setValue("skills", skills.join(", "));
        if (contactInfo) {
          if (contactInfo.email) setValue("contactInfo.email", contactInfo.email);
          if (contactInfo.phone) setValue("contactInfo.mobile", contactInfo.phone);
          if (contactInfo.linkedin) setValue("contactInfo.linkedin", contactInfo.linkedin);
        }
        
        // Handle experiences, education, projects if they exist
        if (experience && experience.length > 0) {
          setValue("experience", experience.map(exp => ({
            title: exp.title || "",
            company: exp.company || "",
            location: exp.location || "",
            startDate: exp.startDate || "",
            endDate: exp.endDate || "",
            current: exp.current || false,
            description: exp.description || ""
          })));
        }
        
        // Similar mapping for education and projects
      }
    }
    
    toast.success("Resume analyzed successfully!");
  };

  // Watch for form changes and update preview
  useEffect(() => {
    if (activeTab === "preview") {
      const newContent = getCombinedContent();
      // Force re-render of markdown when photo changes
      setPreviewContent(newContent ? newContent + " " : initialContent);
    }
  }, [formValues, activeTab]);

  return (
    <div data-color-mode="light" className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
        <h1 className="font-bold gradient-title text-5xl md:text-6xl">
          Resume Builder
        </h1>
        <div className="space-x-2">
          <Button
            variant="destructive"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Resume
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("preview")}
            disabled={activeTab === "preview"}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("edit")}
            disabled={activeTab === "edit"}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>
            <TabsContent value="edit" className="space-y-4">
              <form>
                <div className="space-y-4">
            {/* Contact Information */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold">Contact Information</h2>
                </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Email
                        </label>
                    <Input
                          placeholder="your.email@example.com"
                      {...register("contactInfo.email")}
                    />
                  </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Mobile
                        </label>
                    <Input
                          placeholder="+1 (555) 123-4567"
                      {...register("contactInfo.mobile")}
                    />
                  </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          LinkedIn
                        </label>
                    <Input
                          placeholder="https://linkedin.com/in/yourprofile"
                      {...register("contactInfo.linkedin")}
                    />
                  </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Twitter
                    </label>
                    <Input
                          placeholder="https://twitter.com/yourhandle"
                      {...register("contactInfo.twitter")}
                        />
                      </div>
                    </div>
                    <PhotoUpload
                      value={formValues.contactInfo.photo}
                      onChange={(url) => setValue("contactInfo.photo", url)}
                    />
            </div>

                  {/* Professional Summary */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold">Professional Summary</h2>
                    <Button
                      type="button"
                        size="sm"
                      variant="outline"
                      onClick={handleImproveSummary}
                        disabled={isImproving || !formValues.summary}
                    >
                      {isImproving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Wand2 className="mr-2 h-4 w-4" />
                        )}
                          Improve with AI
                    </Button>
                    </div>
                    <Textarea
                      placeholder="A brief summary of your professional background, skills, and career goals."
                      className="min-h-[120px]"
                      {...register("summary")}
                    />
                    {errors.summary && (
                      <p className="text-destructive text-sm">
                        {errors.summary.message}
                      </p>
                    )}
            </div>

            {/* Skills */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h2 className="text-lg font-semibold">Skills</h2>
                  <Textarea
                      placeholder="List your key skills, separated by commas."
                      className="min-h-[100px]"
                      {...register("skills")}
              />
              {errors.skills && (
                      <p className="text-destructive text-sm">
                        {errors.skills.message}
                      </p>
              )}
            </div>

                  {/* Work Experience */}
                  <EntryForm
                    type="Experience"
                    entries={formValues.experience}
                    onChange={(value) => setValue("experience", value)}
                  />

            {/* Education */}
                  <EntryForm
                    type="Education"
                    entries={formValues.education}
                    onChange={(value) => setValue("education", value)}
                  />

            {/* Projects */}
                  <EntryForm
                    type="Projects"
                    entries={formValues.projects}
                    onChange={(value) => setValue("projects", value)}
                  />
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview">
              <div className="bg-white rounded-lg p-8 border min-h-[800px]">
                <div className="prose prose-sm max-w-none" id="resume-pdf">
                  {resumeMode === "edit" ? (
                    <div className="markdown-editor-container">
                      <MDEditor
                        value={previewContent || ""}
                        onChange={setPreviewContent}
                        preview="edit"
                        height={600}
                      />
                    </div>
                  ) : (
                    <div className="markdown-preview-container">
                      <MDEditor.Markdown
                        source={previewContent || "No content yet. Start editing your resume!"}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-between">
            <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResumeMode(resumeMode === "preview" ? "edit" : "preview")}
            >
              {resumeMode === "preview" ? (
                <>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Markdown
                </>
              ) : (
                <>
                      <Monitor className="mr-2 h-4 w-4" />
                      Preview
                </>
              )}
            </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generatePDF}
                  disabled={isGenerating || !previewContent}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download as PDF
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <ResumeUpload onUploadComplete={handleResumeAnalysis} />
              
              {atsAnalysis && (
                <div className="mt-6 space-y-2">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Sparkles className="h-5 w-5 text-primary mr-2" />
                    ATS Analysis Results
                  </h3>
                  <ATSScoreCard analysis={atsAnalysis} industry={industry} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {/* ATS Score section - only shown when explicitly requested through resume upload */}
          {atsAnalysis && (
            <div className="border rounded-lg p-4 bg-white/5">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-primary" />
                ATS Score
              </h2>
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative h-24 w-24">
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
                      className={`${atsAnalysis.atsScore >= 80 ? 'text-green-500' : atsAnalysis.atsScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}
                      strokeWidth="8"
                      strokeDasharray={`${atsAnalysis.atsScore * 2.4} 1000`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="38"
                      cx="50"
                      cy="50"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                    {Math.round(atsAnalysis.atsScore)}%
              </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {atsAnalysis.atsScore >= 80 
                      ? "Excellent" 
                      : atsAnalysis.atsScore >= 60 
                        ? "Good" 
                        : atsAnalysis.atsScore >= 40 
                          ? "Average" 
                          : "Needs Improvement"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {atsAnalysis.feedback ? 
                      (atsAnalysis.feedback.length > 100 
                        ? atsAnalysis.feedback.substring(0, 100) + '...' 
                        : atsAnalysis.feedback) 
                      : "Your resume has been analyzed against Applicant Tracking Systems."}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setActiveTab("upload")}
              >
                <FileUp className="h-4 w-4 mr-2" />
                View Full Analysis
              </Button>
            </div>
          )}

          {/* Tips section - only show if ATS analysis is present */}
          {atsAnalysis && (
            <div className="border rounded-lg p-4 bg-white/5">
              <h2 className="text-lg font-semibold mb-2">Resume Tips</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <span>Use action verbs to describe your accomplishments</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <span>Quantify your achievements with metrics and numbers</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <span>Tailor your resume to match the job description</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <span>Keep your resume to 1-2 pages maximum</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
          </div>
                  <span>Use a clean, professional layout with consistent formatting</span>
                </li>
              </ul>

              {/* Industry-specific tips would go here if we have industry data */}
              {industry && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium text-sm mb-2">
                    {industry} Industry Tips:
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start space-x-2">
                      <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
                        <Sparkles className="h-3 w-3" />
                      </div>
                      <span>Include relevant {industry} certifications</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="rounded-full bg-primary/10 text-primary p-1 mt-0.5">
                        <Sparkles className="h-3 w-3" />
                      </div>
                      <span>Highlight experience with industry-specific tools</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
            </div>
          </div>
    </div>
  );
}