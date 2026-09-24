import { BrowserQRCodeReader } from "@zxing/browser";
import { selectQrDecoder } from "@/lib/scanner/ticketScan";

export const SCAN_FRAME_INTERVAL_MS = 200;

const REAR_CAMERA_ATTEMPTS: MediaTrackConstraints[] = [
  { facingMode: { exact: "environment" } },
  { facingMode: "environment" },
];

type DetectedBarcode = { rawValue?: string };

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

export type QrScanSession = {
  stop: () => void;
};

type BarcodeDetectorHost = typeof globalThis & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

export function barcodeDetectorConstructor(
  scope: BarcodeDetectorHost = globalThis as BarcodeDetectorHost
): BarcodeDetectorConstructor | null {
  const candidate = scope.BarcodeDetector;
  return typeof candidate === "function" ? candidate : null;
}

export function cameraUnavailableMessage(): string | null {
  if (typeof window === "undefined") {
    return "Camera is only available in the browser.";
  }
  if (!window.isSecureContext) {
    return "Camera scanning needs a secure connection. Open this page over HTTPS.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser cannot access the camera.";
  }
  return null;
}

export function isCameraPermissionError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
  );
}

function stopStream(stream: MediaStream, video: HTMLVideoElement) {
  stream.getTracks().forEach((track) => track.stop());
  if (video.srcObject === stream) {
    video.srcObject = null;
  }
}

export async function openRearCamera(): Promise<MediaStream> {
  const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if (!getUserMedia) {
    throw new Error("This browser cannot access the camera.");
  }

  let lastError: unknown;
  for (const video of REAR_CAMERA_ATTEMPTS) {
    try {
      return await getUserMedia({ audio: false, video });
    } catch (error) {
      lastError = error;
      if (isCameraPermissionError(error)) throw error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Unable to open the camera.");
}

async function startZxingSession(
  video: HTMLVideoElement,
  stream: MediaStream,
  onCode: (code: string) => void
): Promise<QrScanSession> {
  const reader = new BrowserQRCodeReader(undefined, {
    delayBetweenScanAttempts: SCAN_FRAME_INTERVAL_MS,
    delayBetweenScanSuccess: SCAN_FRAME_INTERVAL_MS,
  });
  const controls = await reader.decodeFromStream(stream, video, (result) => {
    const text = result?.getText();
    if (text) onCode(text);
  });

  return {
    stop() {
      controls.stop();
      stopStream(stream, video);
    },
  };
}

function startBarcodeDetectorSession(
  video: HTMLVideoElement,
  stream: MediaStream,
  detector: BarcodeDetectorInstance,
  onCode: (code: string) => void
): QrScanSession {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const codes = await detector.detect(video);
        const value = codes.find((code) => code.rawValue)?.rawValue;
        if (value) onCode(value);
      }
    } catch {
      // A frame can fail while the camera is still settling.
    }
    if (!stopped) {
      timer = setTimeout(() => {
        void tick();
      }, SCAN_FRAME_INTERVAL_MS);
    }
  };

  timer = setTimeout(() => {
    void tick();
  }, SCAN_FRAME_INTERVAL_MS);

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      stopStream(stream, video);
    },
  };
}

export async function startQrScanSession(
  video: HTMLVideoElement,
  onCode: (code: string) => void
): Promise<QrScanSession> {
  const stream = await openRearCamera();
  try {
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    const Detector = barcodeDetectorConstructor();
    if (selectQrDecoder(Detector !== null) === "barcode-detector" && Detector) {
      try {
        const detector = new Detector({ formats: ["qr_code"] });
        return startBarcodeDetectorSession(video, stream, detector, onCode);
      } catch {
        // Safari and some WebViews expose a broken detector. Fall through to ZXing.
      }
    }

    return await startZxingSession(video, stream, onCode);
  } catch (error) {
    stopStream(stream, video);
    throw error;
  }
}
