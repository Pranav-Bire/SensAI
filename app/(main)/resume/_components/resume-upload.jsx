"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { analyzeResume } from "@/actions/resume";

export default function ResumeUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const allowedFileTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    
    if (!selectedFile) return;
    
    if (!allowedFileTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Please upload a PDF or Word document.");
      setFile(null);
      return;
    }
    
    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      setError("File is too large. Maximum size is 5MB.");
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const resetFile = () => {
    setFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 150);
    return interval;
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const progressInterval = simulateProgress();
      
      // Read file content
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const fileContent = e.target.result;
          
          // Get file as Base64 string
          const base64Content = fileContent.split(',')[1];
          
          // Send to server for analysis
          const result = await analyzeResume({
            fileName: file.name,
            fileType: file.type,
            content: base64Content
          });
          
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          if (result.error) {
            throw new Error(result.error);
          }
          
          // Notify parent component of successful analysis
          if (onUploadComplete) {
            onUploadComplete(result);
          }
          
          toast.success("Resume analyzed successfully!");
          
        } catch (error) {
          clearInterval(progressInterval);
          setError(error.message || "Failed to analyze resume");
          setUploadProgress(0);
          toast.error("Analysis failed. Please try again.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      
      fileReader.onerror = () => {
        clearInterval(progressInterval);
        setError("Error reading file");
        setIsAnalyzing(false);
        setUploadProgress(0);
      };
      
      // Read as data URL to get Base64 encoding
      fileReader.readAsDataURL(file);
      
    } catch (error) {
      setError(error.message || "An unexpected error occurred");
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Upload Your Resume</CardTitle>
        <CardDescription>
          Upload your existing resume for ATS analysis and improvement suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-gray-300 hover:border-primary"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
          <div className="flex flex-col items-center space-y-4">
            <Upload
              className={`h-12 w-12 ${
                isDragging ? "text-primary" : "text-muted-foreground"
              }`}
            />
            {file ? (
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary truncate max-w-xs">
                  {file.name}
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">
                  Drag & drop your resume or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF and Word documents up to 5MB
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {uploadProgress > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{uploadProgress === 100 ? "Complete" : "Analyzing..."}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 border-t px-6 py-4">
        {file && (
          <Button variant="ghost" onClick={resetFile} disabled={isAnalyzing}>
            Reset
          </Button>
        )}
        <Button 
          onClick={handleAnalyze} 
          disabled={!file || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : uploadProgress === 100 ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Analysis Complete
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Analyze Resume
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 