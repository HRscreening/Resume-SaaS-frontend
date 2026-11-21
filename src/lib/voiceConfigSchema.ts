import { z } from "zod";
import { countryForDial } from "./countries";

const nonNegative = (label: string) => z.number({ error: `${label} must be a number` }).min(0, `${label} cannot be negative`);
const optionalText = z.string().trim().nullish();

export const voiceQuestionSchema = z.object({
  text: z.string().trim().min(1, "Question text is required."),
  competency_ref: z.string().trim().min(1, "Choose a competency for this question."),
  expected_signals: z.array(z.string().trim().min(1, "Expected signals cannot be blank.")),
  text_hi: optionalText,
  expected_answer: optionalText,
  grading_notes: optionalText,
  weight: z.number().min(1, "Question weight must be between 1 and 5.").max(5, "Question weight must be between 1 and 5.").optional(),
});

export const voiceConfigSchema = z.object({
  enabled: z.boolean(),
  question_plan: z.array(voiceQuestionSchema).min(1, "Generate questions or add at least one question before saving the voice round."),
  hiring_company: z.string({ error: "Hiring company is required." }).trim().min(1, "Hiring company is required."),
  interview_depth: z.enum(["screening", "deep_dive", "interview"], { error: "Choose a valid interview type." }).optional(),
  language: z.enum(["en", "hi"], { error: "Choose English or Hindi." }),
  voice: z.object({ accent: z.enum(["us", "in"], { error: "Choose a supported voice accent." }) }),
  default_country_code: z.string().refine((value) => /^\+[1-9]\d{0,3}$/.test(value) && Boolean(countryForDial(value)), "Choose a valid country calling code."),
  calling_window: z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid calling window start time."),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid calling window end time."),
    tz: z.string().trim().min(1, "Calling timezone is required.").refine((value) => {
      try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
      catch { return false; }
    }, "Choose a valid calling timezone."),
  }).refine((value) => value.start !== value.end, {
    path: ["end"], message: "Calling window start and end must be different.",
  }),
  retry_policy: z.object({
    max_attempts: z.number().int("Retry attempts must be a whole number.").min(1, "Retry attempts must be at least 1."),
    backoff: z.enum(["exponential", "linear", "fixed"], { error: "Choose a valid retry policy." }),
  }),
  max_concurrent_calls_override: z.number().int("Concurrent calls must be a whole number.").min(1, "Concurrent calls must be at least 1.").nullable(),
  qualification: z.object({
    budget_cap: nonNegative("Budget cap").nullish(),
    budget_band_pct: nonNegative("Negotiation band").max(100, "Negotiation band cannot exceed 100%.").optional(),
    distance_threshold_km: nonNegative("Distance threshold").optional(),
    work_model: z.enum(["remote", "onsite", "hybrid"], { error: "Choose a valid work model." }).nullish(),
    job_city: optionalText,
    relocation_required: z.boolean().optional(),
    ask_notice: z.boolean().optional(),
    ask_compensation: z.boolean().optional(),
    ask_location: z.boolean().optional(),
    role_facts: z.array(z.string().trim().min(1, "Fill in or remove empty shareable role facts.")).optional(),
  }).nullish(),
}).superRefine((data, ctx) => {
  const qual = data.qualification;
  if ((qual?.work_model === "onsite" || qual?.work_model === "hybrid")
    && ((qual.ask_location ?? true) || qual.relocation_required) && !qual.job_city) {
    ctx.addIssue({ code: "custom", path: ["qualification", "job_city"], message: "Job city is required for onsite or hybrid location and relocation checks." });
  }
});
