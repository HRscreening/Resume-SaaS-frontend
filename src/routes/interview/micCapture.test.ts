import { describe, expect, it, vi } from "vitest";

import { enableMicrophone, isMissingDeviceError, micCaptureOptions } from "./micCapture";

function namedError(name: string): Error {
  const e = new Error(name);
  e.name = name;
  return e;
}

describe("micCaptureOptions", () => {
  it("pins the tested device exactly and turns voice isolation off", () => {
    expect(micCaptureOptions("abc")).toEqual({
      deviceId: { exact: "abc" },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      voiceIsolation: false,
    });
  });
  it("leaves the device to the browser when none was tested", () => {
    expect(micCaptureOptions(undefined).deviceId).toBeUndefined();
    expect(micCaptureOptions(null).deviceId).toBeUndefined();
    expect(micCaptureOptions("").deviceId).toBeUndefined();
  });
});

describe("isMissingDeviceError", () => {
  it("recognises a missing exact device", () => {
    expect(isMissingDeviceError(namedError("OverconstrainedError"))).toBe(true);
    expect(isMissingDeviceError({ name: "OverconstrainedError", constraint: "deviceId" })).toBe(true);
    expect(isMissingDeviceError(namedError("NotFoundError"))).toBe(true);
  });
  it("does not swallow permission or unknown errors", () => {
    expect(isMissingDeviceError(namedError("NotAllowedError"))).toBe(false);
    expect(isMissingDeviceError("boom")).toBe(false);
    expect(isMissingDeviceError(null)).toBe(false);
  });
});

describe("enableMicrophone", () => {
  it("opens the tested device with the publish options", async () => {
    const setMicrophoneEnabled = vi.fn().mockResolvedValue(undefined);
    await enableMicrophone({ setMicrophoneEnabled }, "dev1", { preConnectBuffer: true });
    expect(setMicrophoneEnabled).toHaveBeenCalledTimes(1);
    expect(setMicrophoneEnabled).toHaveBeenCalledWith(true, micCaptureOptions("dev1"), { preConnectBuffer: true });
  });

  it("falls back to the default device when the tested one is gone", async () => {
    const setMicrophoneEnabled = vi
      .fn()
      .mockRejectedValueOnce(namedError("OverconstrainedError"))
      .mockResolvedValueOnce(undefined);
    await enableMicrophone({ setMicrophoneEnabled }, "gone", { preConnectBuffer: true });
    expect(setMicrophoneEnabled).toHaveBeenCalledTimes(2);
    expect(setMicrophoneEnabled.mock.calls[1]).toEqual([true, micCaptureOptions(undefined), { preConnectBuffer: true }]);
  });

  it("rethrows a permission error without retrying", async () => {
    const setMicrophoneEnabled = vi.fn().mockRejectedValue(namedError("NotAllowedError"));
    await expect(enableMicrophone({ setMicrophoneEnabled }, "dev1")).rejects.toThrow("NotAllowedError");
    expect(setMicrophoneEnabled).toHaveBeenCalledTimes(1);
  });

  it("rethrows when there was no device to fall back from", async () => {
    const setMicrophoneEnabled = vi.fn().mockRejectedValue(namedError("OverconstrainedError"));
    await expect(enableMicrophone({ setMicrophoneEnabled }, undefined)).rejects.toThrow();
    expect(setMicrophoneEnabled).toHaveBeenCalledTimes(1);
  });
});
