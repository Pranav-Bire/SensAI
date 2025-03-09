"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCoverLetter, updateCoverLetter } from "@/actions/cover-letter";
import useFetch from "@/hooks/use-fetch";
import { coverLetterSchema } from "@/app/lib/schema";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MDEditor from "@uiw/react-md-editor";

export default function CoverLetterGenerator({ initialData }) {
  const router = useRouter();
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(coverLetterSchema),
    defaultValues: initialData || {
      companyName: "",
      jobTitle: "",
      jobDescription: "",
    },
  });

  const {
    loading: generating,
    fn: generateLetterFn,
    data: generatedLetter,
  } = useFetch(generateCoverLetter);

  const {
    loading: updating,
    fn: updateLetterFn,
    data: updatedLetter,
  } = useFetch(updateCoverLetter);

  // Update content when letter is generated
  useEffect(() => {
    if (generatedLetter) {
      toast.success("Cover letter generated successfully!");
      router.push(`/ai-cover-letter/${generatedLetter.id}`);
      reset();
    }
  }, [generatedLetter]);

  // Handle successful update
  useEffect(() => {
    if (updatedLetter) {
      toast.success("Cover letter updated successfully!");
      router.push(`/ai-cover-letter/${updatedLetter.id}`);
    }
  }, [updatedLetter]);

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await updateLetterFn(initialData.id, {
          ...data,
          content: watch("content"),
        });
      } else {
        await generateLetterFn(data);
      }
    } catch (error) {
      toast.error(error.message || "Failed to process cover letter");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>
            Provide information about the position you're applying for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  {...register("companyName")}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="Enter job title"
                  {...register("jobTitle")}
                />
                {errors.jobTitle && (
                  <p className="text-sm text-red-500">
                    {errors.jobTitle.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the job description here"
                className="h-32"
                {...register("jobDescription")}
              />
              {errors.jobDescription && (
                <p className="text-sm text-red-500">
                  {errors.jobDescription.message}
                </p>
              )}
            </div>

            {isEditing && (
              <div className="space-y-2">
                <Label>Cover Letter Content</Label>
                <MDEditor
                  value={watch("content") || initialData.content}
                  onChange={(value) => setValue("content", value)}
                  height={400}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={generating || updating}>
                {generating || updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Generating..."}
                  </>
                ) : (
                  isEditing ? "Update Cover Letter" : "Generate Cover Letter"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
