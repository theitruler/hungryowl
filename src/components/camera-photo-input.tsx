"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Camera, SwitchCamera, X } from "lucide-react";
import { cameraErrorMessage, takeCameraPhoto } from "@/lib/camera";

function CameraCapture({ index, onCapture, onClose }: {
  index: number;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const active = useRef(false);
  const currentFacing = useRef<"environment" | "user">("environment");
  const titleId = useId();
  const [camera, setCamera] = useState<{ facing: "environment" | "user" }>({ facing: "environment" });
  const [opening, setOpening] = useState(true);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    active.current = true;
    dialog.current?.showModal();
    const modal = dialog.current;
    return () => {
      active.current = false;
      modal?.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is unavailable. Open this page over HTTPS on a device with a camera.");
        setOpening(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: camera.facing }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const actualFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
        currentFacing.current = actualFacing === "user" || actualFacing === "environment" ? actualFacing : camera.facing;
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (cancelled) return;
            setReady(false);
            setError("The camera stopped. Close this preview and tap the photo box to try again.");
          });
        });
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
          if (!cancelled) setReady(true);
        }
      } catch (cause) {
        stream?.getTracks().forEach((track) => track.stop());
        if (!cancelled) {
          setReady(false);
          setError(cameraErrorMessage(cause));
        }
      } finally {
        if (!cancelled) setOpening(false);
      }
    }
    void start();
    const preview = video.current;
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (preview) preview.srcObject = null;
    };
  }, [camera]);

  function flipCamera() {
    if (opening || capturing) return;
    const nextFacing = currentFacing.current === "environment" ? "user" : "environment";
    currentFacing.current = nextFacing;
    setReady(false);
    setOpening(true);
    setError("");
    setCamera({ facing: nextFacing });
  }

  async function capture() {
    if (!video.current || !ready || capturing) return;
    setCapturing(true);
    try {
      const photo = await takeCameraPhoto(video.current, index);
      if (active.current) {
        dialog.current?.close();
        onCapture(photo);
      }
    } catch (cause) {
      if (active.current) {
        setError(cause instanceof Error ? cause.message : "Please take the photo again.");
        setCapturing(false);
      }
    }
  }

  function close() {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog ref={dialog} className="camera-dialog" aria-labelledby={titleId} onCancel={(event) => {
      event.preventDefault();
      close();
    }}>
      <div className="camera-heading">
        <h2 id={titleId}>Take stall photo {index + 1}</h2>
        <button type="button" className="icon-button" aria-label="Close camera" onClick={close}>
          <X size={22} />
        </button>
      </div>
      <p>{index === 0 ? "Show the stall and its signboard." : "Capture another view of the stall."}</p>
      <video ref={video} className="camera-preview" autoPlay muted playsInline
        aria-label="Live camera preview" />
      <div className="camera-actions">
        <button type="button" className="button secondary small" disabled={opening || capturing} onClick={flipCamera}>
          <SwitchCamera size={18} /> Flip camera
        </button>
      </div>
      {error ? <p className="notice error" role="alert">{error}</p>
        : !ready && <p role="status">Opening camera… Allow camera access when asked.</p>}
      <div className="camera-actions">
        <button type="button" className="button secondary" onClick={close}>Cancel</button>
        <button type="button" className="button primary" disabled={!ready || capturing} onClick={capture}>
          <Camera size={18} /> {capturing ? "Saving photo…" : "Take photo"}
        </button>
      </div>
    </dialog>
  );
}

export function CameraPhotoInput({ index, file, existing, onChange }: {
  index: number;
  file: File | null;
  existing?: string;
  onChange: (file: File) => void;
}) {
  const [preview, setPreview] = useState(existing || "");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // A browser-owned blob URL must be created and revoked outside rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <>
      <button type="button" className="photo-upload" aria-label={`${preview ? "Retake" : "Take"} stall photo ${index + 1}`}
        onClick={() => setOpen(true)}>
        {preview ? <>
          <Image src={preview} alt={`Captured stall photo ${index + 1}`} width={600} height={400} unoptimized />
          <span className="photo-caption">Retake photo {index + 1}</span>
        </> : <>
          <Camera size={25} />
          <strong>{index === 0 ? "The stall & signboard" : "Another view of the stall"}</strong>
          <span>Tap to open camera</span>
        </>}
      </button>
      {open && <CameraCapture index={index} onClose={() => setOpen(false)} onCapture={(photo) => {
        onChange(photo);
        setOpen(false);
      }} />}
    </>
  );
}
