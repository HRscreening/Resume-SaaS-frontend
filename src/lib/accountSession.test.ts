import { describe, it, expect, beforeEach } from "vitest";
import { assertWritable, setAccountRole, ReadOnlyError } from "./accountSession";

describe("assertWritable", () => {
  beforeEach(() => setAccountRole("viewer"));

  it("lets safe methods through", () => {
    expect(() => assertWritable("/api/v1/screenings", "GET")).not.toThrow();
    expect(() => assertWritable("/api/v1/screenings")).not.toThrow();
  });
  it("lets the declared read POSTs through", () => {
    expect(() => assertWritable("/api/v1/screenings/x/results?limit=10", "POST")).not.toThrow();
    expect(() => assertWritable("/api/v1/screenings/x/get-applications", "POST")).not.toThrow();
    expect(() => assertWritable("/api/v1/screenings/x/file-url", "POST")).not.toThrow();
  });
  it("throws ReadOnlyError for writes", () => {
    expect(() => assertWritable("/api/v1/screening", "POST")).toThrow(ReadOnlyError);
    expect(() => assertWritable("/api/v1/screenings/x/voice/config", "PUT")).toThrow(ReadOnlyError);
    expect(() => assertWritable("/api/v1/screenings/x", "DELETE")).toThrow(ReadOnlyError);
  });
  it("does nothing for owners", () => {
    setAccountRole("owner");
    expect(() => assertWritable("/api/v1/screening", "POST")).not.toThrow();
  });
  it("defaults to owner when unknown (never flickers controls off)", () => {
    setAccountRole(undefined);
    expect(() => assertWritable("/api/v1/screening", "POST")).not.toThrow();
  });
});
