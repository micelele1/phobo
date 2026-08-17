"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackgroundPicker, KioskButton, KioskStage } from "@/components/kiosk";
import { backgrounds } from "@/lib/phobo-data";
import { useSessionStore } from "@/lib/session/session-store";

type CaptureResponse = {
  ok: boolean;
  imageUrl?: string;
  capturedPhotoUrl?: string;
  displayPhotoUrl?: string;
  error?: string;
};

export default function Camera() {
  const router = useRouter();
  const { session, hasHydrated, selectBackground, addCapturedPhoto } = useSessionStore();
  const captureLock = useRef(false);
  const shotCount = useRef(0);
  const [message, setMessage] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!session?.selectedFrameId) router.replace("/frames");
    else if (!session.selectedBackgroundId) selectBackground(backgrounds[0].id);
  }, [hasHydrated, session?.selectedFrameId, session?.selectedBackgroundId, router, selectBackground]);

  const count = session?.capturedPhotos.length ?? 0;
  const max = session?.maxShots ?? 8;
  const required = max;
  const maxReached = count >= max;
  shotCount.current = count;

  async function shoot() {
    if (!session || captureLock.current || shotCount.current >= max) return;

    captureLock.current = true;
    setIsCapturing(true);

    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(res => setTimeout(res, 1000));
    }
    setCountdown("SMILE!");
    await new Promise(res => setTimeout(res, 500));
    setCountdown(null);

    setMessage("");

    try {
      const response = await fetch("/api/camera/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });

      const data = (await response.json()) as CaptureResponse;
      const url = data.capturedPhotoUrl || data.imageUrl;
      const displayUrl = data.displayPhotoUrl || url;
      
      if (!response.ok || !data.ok || !url) throw new Error(data.error || "CAMERA CAPTURE GAGAL");

      if (shotCount.current >= max) return;
      shotCount.current += 1;
      addCapturedPhoto({ raw: url, display: displayUrl as string });
      setMessage(`FOTO ${shotCount.current} TERSIMPAN`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CAMERA CAPTURE GAGAL");
    } finally {
      captureLock.current = false;
      setIsCapturing(false);
    }
  }

  return (
    <KioskStage>
      <div className="shot-counter">
        Shoot {maxReached ? max : count + 1} / {max}
      </div>
      
      <div style={{
        position: "absolute",
        top: "7.73%", left: "3.47%", width: "72%", height: "70%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a1a",
        borderRadius: "16px",
        color: "#666",
        border: "2px dashed #333",
        zIndex: 10
      }}>
        <span style={{ fontSize: "64px", marginBottom: "20px" }}>📷</span>
        <span style={{ fontSize: "24px", letterSpacing: "2px", fontWeight: "bold" }}>MOHON LIHAT KE LENSA KAMERA</span>
      </div>

      {countdown !== null && (
        <div style={{
          position: "absolute",
          top: "7.73%", left: "3.47%", width: "72%", height: "70%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: typeof countdown === "number" ? "16rem" : "10rem",
          fontWeight: "900",
          color: "#ffffff",
          textShadow: "0 8px 30px rgba(0,0,0,0.8)",
          zIndex: 100,
          pointerEvents: "none"
        }}>
          {countdown}
        </div>
      )}
      
      <BackgroundPicker
        backgrounds={backgrounds}
        selectedBackgroundId={session?.selectedBackgroundId}
        onSelectBackground={selectBackground}
      />
      
      <footer className="camera-actions">
        <div className="camera-status" aria-live="polite">
          {maxReached ? (
            <>
              <span style={{fontWeight: "bold"}}>FOTO MAKSIMAL TERCAPAI</span>
              <span>LANJUT PILIH FOTO</span>
            </>
          ) : (
            message && <span>{message}</span>
          )}
        </div>
        <div className="camera-action-buttons">
          {!maxReached && (
            <KioskButton onClick={shoot} disabled={isCapturing} className="camera-shoot">
              {isCapturing ? "..." : "SHOOT"}
            </KioskButton>
          )}
          {count >= 1 && (
            <KioskButton
              onClick={() => { if (count >= required) router.push("/preview"); }}
              disabled={count < required}
              className={`camera-next ${maxReached ? "camera-next--primary" : ""}`}
            >
              {maxReached ? "NEXT" : `NEXT (${count}/${required})`}
            </KioskButton>
          )}
        </div>
      </footer>
    </KioskStage>
  );
}