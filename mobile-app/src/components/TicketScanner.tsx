import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { validateTicket } from '../services/api';

const { width, height } = Dimensions.get('window');

type ValidationStatus = 'idle' | 'valid' | 'already_used' | 'not_found' | 'error' | 'scanning';

interface TicketData {
  attendee_name: string;
  email: string;
  event_id: string;
  created_at: string;
}

export default function TicketScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading || data === lastScannedCode) {
      return; // Prevent duplicate scans
    }

    setScanned(true);
    setLoading(true);
    setLastScannedCode(data);
    setValidationStatus('scanning');

    try {
      const result = await validateTicket(data);
      
      if (result.success && result.status === 'valid') {
        setValidationStatus('valid');
        setTicketData(result.ticket);
      } else if (result.status === 'already_used') {
        setValidationStatus('already_used');
        setTicketData(result.ticket);
      } else if (result.status === 'not_found') {
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

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
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
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          {/* Scanner frame */}
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          {/* Status overlay */}
          {validationStatus !== 'idle' && (
            <View style={styles.statusOverlay}>
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
                      <Text style={styles.ticketInfoText}>
                        Attendee: {ticketData.attendee_name}
                      </Text>
                      <Text style={styles.ticketInfoText}>
                        Email: {ticketData.email}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.button} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Scan Another</Text>
                  </TouchableOpacity>
                </View>
              ) : validationStatus === 'already_used' ? (
                <View style={[styles.statusCard, styles.warningCard]}>
                  <Text style={styles.statusIcon}>⚠</Text>
                  <Text style={[styles.statusText, styles.warningText]}>
                    Ticket Already Used
                  </Text>
                  {ticketData && (
                    <Text style={styles.ticketInfoText}>
                      This ticket was already scanned
                    </Text>
                  )}
                  <TouchableOpacity style={styles.button} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Scan Another</Text>
                  </TouchableOpacity>
                </View>
              ) : validationStatus === 'not_found' ? (
                <View style={[styles.statusCard, styles.errorCard]}>
                  <Text style={styles.statusIcon}>✗</Text>
                  <Text style={[styles.statusText, styles.errorText]}>
                    Ticket Not Found
                  </Text>
                  <Text style={styles.ticketInfoText}>
                    This ticket does not exist or is invalid
                  </Text>
                  <TouchableOpacity style={styles.button} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.statusCard, styles.errorCard]}>
                  <Text style={styles.statusIcon}>✗</Text>
                  <Text style={[styles.statusText, styles.errorText]}>
                    Validation Error
                  </Text>
                  <Text style={styles.ticketInfoText}>
                    An error occurred while validating the ticket
                  </Text>
                  <TouchableOpacity style={styles.button} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Instructions */}
          {validationStatus === 'idle' && (
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                Position the QR code within the frame
              </Text>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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


