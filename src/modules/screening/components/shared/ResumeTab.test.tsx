import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ResumeTab, { resumeFileType } from "./ResumeTab";
import { uiSearchSchema } from "../../types/searchSchema";

vi.mock("@/lib/services/storage", () => ({
  resumeUploadService: { generateSignedUrls: vi.fn() },
}));

describe("resume previews", () => {
  it.each([
    ["CV.PDF", null, "pdf"],
    [null, "resumes/candidate.doc", "doc"],
    [null, "https://storage.example/CV.DOCX?token=abc#page=1", "docx"],
    ["original.docx", "https://storage.example/download?token=abc", "docx"],
    [null, null, null],
    ["image.png", "resumes/image.png", null],
  ])("detects %s / %s as %s", (filename, path, expected) => {
    expect(resumeFileType(filename, path)).toBe(expected);
  });

  it("accepts resume links for both sheet tabs without losing the selected candidate", () => {
    expect(uiSearchSchema.parse({
      infoTab: "resume", analysisTab: "resume", appId: "application-1", screenId: "candidate-1",
    })).toMatchObject({
      infoTab: "resume", analysisTab: "resume", appId: "application-1", screenId: "candidate-1",
    });
  });

  it("shows a clear empty state when no file is attached", () => {
    const html = renderToStaticMarkup(<ResumeTab screeningId="screening-1" resumePath={null} />);
    expect(html).toContain("No resume file is available");
    expect(html).not.toContain("<iframe");
  });

  it("does not embed an unresolved storage path while loading", () => {
    const html = renderToStaticMarkup(<ResumeTab screeningId="screening-1" resumePath="resumes/cv.pdf" />);
    expect(html).toContain("Loading resume");
    expect(html).not.toContain("<iframe");
  });
});