import { MAX_PHOTO_BYTES } from "./config";

export async function takeCameraPhoto(video: HTMLVideoElement, index: number): Promise<File> {
  if (video.readyState < 2 || video.videoWidth < 200 || video.videoHeight < 200)
    throw new Error("Wait for a clear camera preview before taking the photo.");

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The camera photo could not be captured. Please try again.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob || blob.size === 0 || blob.size > MAX_PHOTO_BYTES)
    throw new Error("The camera photo could not be saved. Please take it again.");
  return new File([blob], `stall-photo-${index + 1}-${Date.now()}.jpg`, { type: "image/jpeg" });
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Allow camera access in your browser settings, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No suitable camera was found. Open this page on a phone or a device with a camera.";
  if (name === "NotReadableError" || name === "AbortError")
    return "The camera is unavailable. Close other apps using it, then try again.";
  return "Could not start the camera. Check camera access and try again.";
}
