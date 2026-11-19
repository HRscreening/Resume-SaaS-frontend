import { describe, expect, it } from "vitest";
import { jdAiFormSchema } from "./jdAiFormSchema";

const valid = {
  jobTitle: " Engineer ", companyName: " Acme ", companyUrl: "acme.com",
  workArrangement: "Remote", employmentType: "Full-time", currency: "INR",
  minSalary: "0", maxSalary: "10.5", minExperience: "0", maxExperience: "50",
  location: "", department: "", skills: "", prompt: "",
};

describe("AI JD form validation", () => {
  it("accepts zero and boundary values, trims text, and normalizes bare domains", () => {
    const result = jdAiFormSchema.parse(valid);
    expect(result.jobTitle).toBe("Engineer");
    expect(result.companyUrl).toBe("https://acme.com");
  });
  it.each(["jobTitle", "companyName", "companyUrl", "minSalary", "maxSalary", "minExperience", "maxExperience"])("rejects blank %s", (field) => {
    expect(jdAiFormSchema.safeParse({ ...valid, [field]: "  " }).success).toBe(false);
  });
  it.each(["not a website", "https://", "ftp://acme.com", "javascript:alert(1)"])("rejects website %s", (companyUrl) => {
    expect(jdAiFormSchema.safeParse({ ...valid, companyUrl }).success).toBe(false);
  });
  it.each(["-1", "NaN", "Infinity", "12abc"])("rejects invalid numeric input %s", (minSalary) => {
    expect(jdAiFormSchema.safeParse({ ...valid, minSalary }).success).toBe(false);
  });
  it.each([
    { minSalary: "2.9", maxSalary: "2.1" },
    { minExperience: "2.9", maxExperience: "2.1" },
    { maxExperience: "50.1" },
    { workArrangement: "unknown" },
    { employmentType: "unknown" },
    { currency: "unknown" },
  ])("rejects invalid ranges and dropdown values: %j", (changes) => {
    expect(jdAiFormSchema.safeParse({ ...valid, ...changes }).success).toBe(false);
  });
  it.each([
    ["minSalary", "maxSalary"],
    ["minExperience", "maxExperience"],
  ])("requires %s to be strictly less than %s", (minField, maxField) => {
    for (const value of ["0", "2.5"]) {
      const result = jdAiFormSchema.safeParse({ ...valid, [minField]: value, [maxField]: value });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(expect.arrayContaining([
          expect.objectContaining({ path: [maxField], message: expect.stringContaining("must be greater than") }),
        ]));
      }
    }
    expect(jdAiFormSchema.safeParse({ ...valid, [minField]: "2.5", [maxField]: "2.6" }).success).toBe(true);
  });
  it("preserves explicit HTTP and HTTPS websites", () => {
    for (const companyUrl of ["http://acme.com", "https://acme.com/jobs"]) {
      expect(jdAiFormSchema.parse({ ...valid, companyUrl }).companyUrl).toBe(companyUrl);
    }
  });
});
