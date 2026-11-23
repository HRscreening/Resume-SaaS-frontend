import { z } from "zod";

const requiredNumber = (label: string, maximum?: number) =>
  z.string().trim().min(1, `${label} is required`).refine(
    (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
    `${label} must be a non-negative number`,
  ).refine(
    (value) => maximum === undefined || value === "" || Number(value) <= maximum,
    `${label} cannot exceed ${maximum} years`,
  );

export const jdAiFormSchema = z.object({
  jobTitle: z.string().trim().min(1, "Job title is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  companyUrl: z.string().trim().min(1, "Company website is required")
    .transform((value) => /^https?:\/\//i.test(value) ? value : `https://${value}`)
    .pipe(z.url({ protocol: /^https?$/, hostname: z.regexes.domain, error: "Enter a valid company website (e.g. acme.com)" })),
  workArrangement: z.enum(["Remote", "Hybrid", "On-site"], { error: "Select a work arrangement" }),
  employmentType: z.enum(["Full-time", "Internship", "Consulting"], { error: "Select an employment type" }),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "JPY", "AUD"], { error: "Select a supported currency" }),
  minSalary: requiredNumber("Minimum salary"),
  maxSalary: requiredNumber("Maximum salary"),
  minExperience: requiredNumber("Minimum experience", 50),
  maxExperience: requiredNumber("Maximum experience", 50),
  location: z.string().trim(),
  department: z.string().trim(),
  skills: z.string().trim(),
  prompt: z.string().trim(),
}).superRefine((data, ctx) => {
  if (data.minSalary && data.maxSalary && Number(data.minSalary) >= Number(data.maxSalary)) {
    ctx.addIssue({ code: "custom", path: ["maxSalary"], message: "Maximum salary must be greater than the minimum salary" });
  }
  if (data.minExperience && data.maxExperience && Number(data.minExperience) >= Number(data.maxExperience)) {
    ctx.addIssue({ code: "custom", path: ["maxExperience"], message: "Maximum experience must be greater than the minimum experience" });
  }
});
