import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as CameraModule from 'expo-camera';
import { PermissionResponse } from 'expo-camera';
// Resolve a runtime Camera component and the permissions hook, but avoid `any` by using
// explicit unions and proper types.
const CameraComp = ((CameraModule as unknown) as {
  Camera?: React.ComponentType<Record<string, unknown>>;
  default?: React.ComponentType<Record<string, unknown>>;
}).Camera ?? ((CameraModule as unknown) as { default?: React.ComponentType<Record<string, unknown>> }).default ?? (CameraModule as unknown) as React.ComponentType<Record<string, unknown>>;
const useCameraPermissionsHook: (() => [PermissionResponse | null, () => Promise<PermissionResponse>]) | null = ((CameraModule as unknown) as {
  useCameraPermissions?: () => [PermissionResponse | null, () => Promise<PermissionResponse>];
}).useCameraPermissions ?? null;
import { validateTicket } from '../services/api';

const { width } = Dimensions.get('window');

// Use named imports from expo-camera for runtime component and permissions hook.

type ValidationStatus = 'idle' | 'valid' | 'already_used' | 'not_found' | 'error' | 'scanning';

interface TicketData {
  attendee_name: string;
  email: string;
  event_id: string;
  created_at: string;
}

export default function TicketScanner(): React.ReactElement {
  // Always call the hook if available; otherwise provide a stable fallback to keep hook order stable.
  const fallbackRequest = async () => ({
    canAskAgain: false,
    granted: false,
    expires: 'never',
  } as PermissionResponse);
  const hook = useCameraPermissionsHook ?? (() => [null, fallbackRequest]);
  const [permission, requestPermission] = hook();
  const [scanned, setScanned] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  // Camera constants are runtime strings; use string to avoid `any` typing.
  type CameraConstType = string;
  const cameraConstants = ((CameraModule as unknown) as { Constants?: { Type?: { back?: string } } }).Constants;
  const [cameraType] = useState<CameraConstType>(cameraConstants?.Type?.back ?? 'back');

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading || data === lastScannedCode) return;

    setScanned(true);
    setLoading(true);
    setLastScannedCode(data);
    setValidationStatus('scanning');

    try {
      const result = await validateTicket(data);
      console.log('validateTicket result:', result);

      if (result && result.status === 'valid') {
        setValidationStatus('valid');
        setTicketData(result.ticket ?? null);
      } else if (result && result.status === 'already_used') {
        setValidationStatus('already_used');
        setTicketData(result.ticket ?? null);
      } else if (result && result.status === 'not_found') {
        setValidationStatus('not_found');
        setTicketData(null);
      } else {
        setValidationStatus('error');
        setTicketData(null);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationStatus('error');
      setTicketData(null);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setValidationStatus('idle');
    setTicketData(null);
    setLastScannedCode(null);
  };

  if (!permission || !permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Camera permission is required to scan tickets</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraComp
          style={StyleSheet.absoluteFill}
          type={cameraType}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: ['qr'],
          }}
        />

        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.scannerFrame} pointerEvents="none">
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          {validationStatus !== 'idle' && (
            <View style={styles.statusOverlay} pointerEvents="auto">
              {loading ? (
                <View style={styles.statusCard}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={styles.statusText}>Validating ticket...</Text>
                </View>
              ) : validationStatus === 'valid' ? (
                <View style={[styles.statusCard, styles.successCard]}>
                  <Text style={styles.statusIcon}>✓</Text>
                  <Text style={[styles.statusText, styles.successText]}>Ticket Valid!</Text>
                  {ticketData && (
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketInfoText}>Attendee: {ticketData.attendee_name}</Text>
                      <Text style={styles.ticketInfoText}>Email: {ticketData.email}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.button} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Scan Another</Text>
                  </TouchableOpacity>
                </View>
              ) : validationStatus === 'already_used' ? (
                <View style={[styles.statusCard, styles.warningCard]}>
                  <Text style={styles.statusIcon}>⚠</Text>
                  <Text style={[styles.statusText, styles.warningText]}>Ticket Already Used</Text>
                  <TouchableOpacity style={styles.button} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Scan Another</Text>
                  </TouchableOpacity>
                </View>
              ) : validationStatus === 'not_found' ? (
                <View style={[styles.statusCard, styles.errorCard]}>
                  <Text style={styles.statusIcon}>✗</Text>
                  <Text style={[styles.statusText, styles.errorText]}>Ticket Not Found</Text>
                  <TouchableOpacity style={styles.button} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.statusCard, styles.errorCard]}>
                  <Text style={styles.statusIcon}>✗</Text>
                  <Text style={[styles.statusText, styles.errorText]}>Validation Error</Text>
                  <TouchableOpacity style={styles.button} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {validationStatus === 'idle' && (
            <View style={styles.instructions} pointerEvents="none">
              <Text style={styles.instructionText}>Position the QR code within the frame</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: width * 0.8,
    height: width * 0.8,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#10b981',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#10b981',
  },
  warningCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#f59e0b',
  },
  errorCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#ef4444',
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#10b981',
  },
  warningText: {
    color: '#f59e0b',
  },
  errorText: {
    color: '#ef4444',
  },
  ticketInfo: {
    width: '100%',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  ticketInfoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
});
