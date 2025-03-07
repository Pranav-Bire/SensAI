import { z } from "zod";

export const onboardingSchema = z.object({
  industry: z.string({
    required_error: "Please Select an Industry",
  }),
  subIndustry: z.string({
    required_error: "Please Select a Specialization",
  }),
  bio: z.string().max(500).optional(),
  experience: z.string().transform(val => parseInt(val, 10))
    .pipe(
      z.number().min(0, "Experience must be atleast 0 years ")
        .max(50, "Experience must be atmost 50 years ")
    ),
  skills: z.string().transform(val =>
    val ? val.split(",").map((skill) => skill.trim())
      .filter(Boolean)
      : undefined
  ),
});

export const contactSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  photo: z.string().optional(),
});

export const entrySchema = z.object({
  title: z.string().min(1, "Title is required"),
  organization: z.string().min(1, "Organization is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  current: z.boolean().default(false),
}).refine((data) => {
  if (!data.current && !data.endDate) {
    return false;
  }
  return true;
}, {
  message: "End date is required if current is false",
  path: ["endDate"],
});

export const resumeSchema = z.object({
  contactInfo: contactSchema,
  summary: z.string().min(1, "Summary is required"),
  skills: z.string().min(1, "Skills are required"),
  experience: z.array(entrySchema),
  education: z.array(entrySchema),
  projects: z.array(entrySchema),
});
