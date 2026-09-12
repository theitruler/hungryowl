import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cameraErrorMessage, takeCameraPhoto } from "../src/lib/camera";

const drawImage = vi.fn();
const canvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({ drawImage })),
  toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(new Blob(["camera frame"], { type: "image/jpeg" }))),
};
const video = (width = 1920, height = 1080, readyState = 2) => ({
  videoWidth: width, videoHeight: height, readyState,
}) as HTMLVideoElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("document", { createElement: () => canvas });
});
afterEach(() => vi.unstubAllGlobals());

describe("camera photo capture", () => {
  it("creates a JPEG from the live frame within upload dimensions", async () => {
    const preview = video();
    const photo = await takeCameraPhoto(preview, 0);
    expect(drawImage).toHaveBeenCalledWith(preview, 0, 0, 1600, 900);
    expect(photo.type).toBe("image/jpeg");
    expect(photo.name).toMatch(/^stall-photo-1-\d+\.jpg$/);
    expect(await photo.text()).toBe("camera frame");
  });

  it("preserves portrait framing without upscaling", async () => {
    await takeCameraPhoto(video(600, 800), 1);
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(800);
  });

  it.each([[0, 0, 0], [1920, 1080, 1], [100, 100, 2]])(
    "rejects a missing or low-resolution preview (%s x %s, ready %s)", async (width, height, ready) => {
      await expect(takeCameraPhoto(video(width, height, ready), 0)).rejects.toThrow("Wait for a clear camera preview");
      expect(drawImage).not.toHaveBeenCalled();
    },
  );

  it("rejects failed encoding instead of saving an empty photo", async () => {
    canvas.toBlob.mockImplementationOnce((callback) => callback(null));
    await expect(takeCameraPhoto(video(), 0)).rejects.toThrow("could not be saved");
  });

  it.each([
    ["NotAllowedError", "Allow camera access"],
    ["NotFoundError", "No suitable camera"],
    ["NotReadableError", "Close other apps"],
  ])("explains %s without offering a gallery fallback", (name, message) => {
    expect(cameraErrorMessage(new DOMException("", name))).toContain(message);
  });
});
