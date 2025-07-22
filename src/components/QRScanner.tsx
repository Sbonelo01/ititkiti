"use client";
import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeCameraScanConfig, CameraDevice } from "html5-qrcode";

export default function QRScanner({ onScan, onClose }: { onScan: (value: string) => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enumerate cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) {
          setSelectedCameraId(devices[0].id);
        } else {
          setError("No cameras found on this device.");
        }
      })
      .catch((err) => {
        setError("Unable to access cameras: " + err);
      });
    return () => {
      // Cleanup on unmount
      if (html5QrCodeRef.current) {
        const stopResult = html5QrCodeRef.current.stop();
        if (typeof stopResult === 'object' && stopResult !== null && typeof (stopResult as Promise<unknown>).catch === 'function') {
          (stopResult as Promise<unknown>).catch(() => {});
        }
        const clearResult = html5QrCodeRef.current.clear();
        if (typeof clearResult === 'object' && clearResult !== null && typeof (clearResult as Promise<unknown>).catch === 'function') {
          (clearResult as Promise<unknown>).catch(() => {});
        }
      }
    };
  }, []);

  // Start/stop scanning when camera changes
  useEffect(() => {
    if (!selectedCameraId || !containerRef.current) return;
    if (html5QrCodeRef.current) {
      const stopResult = html5QrCodeRef.current.stop();
      if (typeof stopResult === 'object' && stopResult !== null && typeof (stopResult as Promise<unknown>).catch === 'function') {
        (stopResult as Promise<unknown>).catch(() => {});
      }
      const clearResult = html5QrCodeRef.current.clear();
      if (typeof clearResult === 'object' && clearResult !== null && typeof (clearResult as Promise<unknown>).catch === 'function') {
        (clearResult as Promise<unknown>).catch(() => {});
      }
    }
    const qrCode = new Html5Qrcode("qr-reader");
    html5QrCodeRef.current = qrCode;
    qrCode
      .start(
        { deviceId: { exact: selectedCameraId } },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        } as Html5QrcodeCameraScanConfig,
        (decodedText) => {
          const stopResult = qrCode.stop();
          if (typeof stopResult === 'object' && stopResult !== null && typeof (stopResult as Promise<unknown>).catch === 'function') {
            (stopResult as Promise<unknown>).catch(() => {});
          }
          onScan(decodedText);
        },
        () => {
          // Optionally show error
        }
      )
      .catch((err) => {
        setError("Failed to start camera: " + err);
      });
    return () => {
      if (html5QrCodeRef.current) {
        const stopResult = html5QrCodeRef.current.stop();
        if (typeof stopResult === 'object' && stopResult !== null && typeof (stopResult as Promise<unknown>).catch === 'function') {
          (stopResult as Promise<unknown>).catch(() => {});
        }
        const clearResult = html5QrCodeRef.current.clear();
        if (typeof clearResult === 'object' && clearResult !== null && typeof (clearResult as Promise<unknown>).catch === 'function') {
          (clearResult as Promise<unknown>).catch(() => {});
        }
      }
    };
  }, [selectedCameraId, onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative flex flex-col items-center">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          onClick={onClose}
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-xl font-bold mb-6 text-center text-gray-800">Scan Ticket QR Code</h3>
        <div className="w-full flex flex-col items-center">
          {/* Camera selection dropdown */}
          {cameras.length > 1 && (
            <select
              className="mb-4 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={selectedCameraId || ''}
              onChange={e => setSelectedCameraId(e.target.value)}
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
              ))}
            </select>
          )}
          <div ref={containerRef} id="qr-reader" className="w-full"></div>
          {error && <div className="text-red-600 mt-4">{error}</div>}
        </div>
      </div>
    </div>
  );
} 