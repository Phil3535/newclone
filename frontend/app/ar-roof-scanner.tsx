import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RoofPoint {
  x: number;
  y: number;
}

interface ScanResult {
  roofArea: number;
  panelCount: number;
  systemSize: number;
  estimatedSavings: number;
  estimatedCost: number;
  paybackYears: number;
}

export default function ARRoofScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [roofPoints, setRoofPoints] = useState<RoofPoint[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [demoMode, setDemoMode] = useState(Platform.OS === 'web');
  const cameraRef = useRef<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  // Demo mode for web or when camera not available
  const runDemoScan = () => {
    setIsScanning(true);
    // Simulate scanning with demo points
    // Demo points representing a large roof area (scaled for visual demo)
    const demoPoints: RoofPoint[] = [
      { x: 150, y: 100 },
      { x: 650, y: 80 },
      { x: 700, y: 350 },
      { x: 100, y: 380 },
    ];
    
    let pointIndex = 0;
    const interval = setInterval(() => {
      if (pointIndex < demoPoints.length) {
        const currentPoint = demoPoints[pointIndex]; // Capture the point before incrementing
        setRoofPoints(prev => [...prev, currentPoint]);
        pointIndex++;
      } else {
        clearInterval(interval);
        // Use fixed demo values for consistent, impressive results
        const demoResult = {
          roofArea: 1850,
          panelCount: 22,
          systemSize: 8.8,
          estimatedSavings: 2240,
          estimatedCost: 22000,
          paybackYears: 9.8,
        };
        setScanResult(demoResult);
        setShowResults(true);
        setIsScanning(false);
      }
    }, 500);
  };

  const handleCameraPress = (event: any) => {
    if (!isScanning) return;
    
    const { locationX, locationY } = event.nativeEvent;
    const newPoint = { x: locationX, y: locationY };
    
    setRoofPoints(prev => {
      const updated = [...prev, newPoint];
      if (updated.length >= 4) {
        calculateRoofMetrics(updated);
      }
      return updated;
    });
  };

  const calculateRoofMetrics = (points: RoofPoint[]) => {
    // Calculate polygon area using Shoelace formula
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Scale to approximate real-world square feet (assuming camera view represents ~40ft width)
    const scaleFactor = 40 / SCREEN_WIDTH;
    const roofAreaSqFt = area * scaleFactor * scaleFactor;
    
    // Solar calculations
    const usableArea = roofAreaSqFt * 0.75; // 75% usable for panels
    const panelSize = 17.5; // sq ft per panel (standard 400W panel)
    const panelCount = Math.floor(usableArea / panelSize);
    const panelWattage = 400; // watts per panel
    const systemSize = (panelCount * panelWattage) / 1000; // kW
    
    // Financial estimates
    const avgSunHours = 5; // hours per day
    const electricityRate = 0.14; // $/kWh
    const annualProduction = systemSize * avgSunHours * 365; // kWh/year
    const annualSavings = annualProduction * electricityRate;
    const costPerWatt = 2.50;
    const systemCost = systemSize * 1000 * costPerWatt;
    const payback = systemCost / annualSavings;

    setScanResult({
      roofArea: Math.round(roofAreaSqFt),
      panelCount,
      systemSize: Math.round(systemSize * 10) / 10,
      estimatedSavings: Math.round(annualSavings),
      estimatedCost: Math.round(systemCost),
      paybackYears: Math.round(payback * 10) / 10,
    });
    
    setIsScanning(false);
    setShowResults(true);
  };

  const startScan = () => {
    setRoofPoints([]);
    setScanResult(null);
    setShowResults(false);
    setIsScanning(true);
    
    if (demoMode) {
      runDemoScan();
    }
  };

  const resetScan = () => {
    setRoofPoints([]);
    setScanResult(null);
    setShowResults(false);
    setIsScanning(false);
    setShareUrl('');
  };

  const saveToLead = () => {
    Alert.alert(
      'Scan Saved!',
      `Roof scan saved:\n• ${scanResult?.systemSize} kW system\n• ${scanResult?.panelCount} panels\n• $${scanResult?.estimatedSavings}/year savings`,
      [
        { text: 'Create Lead', onPress: () => router.push('/leads') },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  const generateShareableLink = async () => {
    if (!scanResult) return;
    
    setIsGeneratingShare(true);
    try {
      const response = await fetch(`${API_URL}/api/scan-results/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roof_area: scanResult.roofArea,
          panel_count: scanResult.panelCount,
          system_size: scanResult.systemSize,
          estimated_savings: scanResult.estimatedSavings,
          estimated_cost: scanResult.estimatedCost,
          payback_years: scanResult.paybackYears,
          rep_name: 'Solar Empire Rep',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create share link');
      
      const data = await response.json();
      setShareUrl(data.share_url);
      setShowQRModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate share link. Please try again.');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    
    try {
      await Share.share({
        message: `Check out my solar savings estimate! I could save $${scanResult?.estimatedSavings.toLocaleString()}/year with solar panels. View my estimate: ${shareUrl}`,
        url: shareUrl,
        title: 'My Solar Savings Estimate',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Render camera permission request
  if (!permission && Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission?.granted && Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#64748b" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            AR Roof Scanner needs camera access to scan and measure roofs
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.permissionButton, styles.demoButton]} 
            onPress={() => setDemoMode(true)}
          >
            <Text style={styles.permissionButtonText}>Try Demo Mode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>AR Roof Scanner</Text>
          <Text style={styles.subtitle}>
            {demoMode ? 'Demo Mode' : 'Point at roof to scan'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setDemoMode(!demoMode)} style={styles.modeButton}>
          <Ionicons name={demoMode ? 'camera' : 'play'} size={20} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Camera/Demo View */}
      <View style={styles.cameraContainer}>
        {demoMode ? (
          <View style={styles.demoView}>
            {/* Simulated roof image */}
            <View style={styles.demoRoof}>
              <View style={styles.roofShape} />
              <Text style={styles.demoLabel}>Demo Roof View</Text>
            </View>
            
            {/* Roof points overlay */}
            {roofPoints.filter(point => point && typeof point.x === 'number').map((point, index) => (
              <View
                key={index}
                style={[
                  styles.roofPoint,
                  { left: point.x - 10, top: point.y - 10 },
                ]}
              >
                <Text style={styles.pointLabel}>{index + 1}</Text>
              </View>
            ))}
            
            {/* Lines connecting points */}
            {roofPoints.filter(p => p && typeof p.x === 'number').length > 1 && (
              <View style={styles.linesContainer}>
                {roofPoints.filter(p => p && typeof p.x === 'number').map((point, index, filteredPoints) => {
                  if (index === 0) return null;
                  const prevPoint = filteredPoints[index - 1];
                  if (!prevPoint || !point) return null;
                  return (
                    <View
                      key={`line-${index}`}
                      style={[
                        styles.line,
                        {
                          left: prevPoint.x,
                          top: prevPoint.y,
                          width: Math.sqrt(
                            Math.pow(point.x - prevPoint.x, 2) +
                            Math.pow(point.y - prevPoint.y, 2)
                          ),
                          transform: [
                            {
                              rotate: `${Math.atan2(
                                point.y - prevPoint.y,
                                point.x - prevPoint.x
                              )}rad`,
                            },
                          ],
                        },
                      ]}
                    />
                  );
                })}
                {/* Closing line */}
                {(() => {
                  const validPoints = roofPoints.filter(p => p && typeof p.x === 'number');
                  if (validPoints.length >= 4) {
                    const firstPoint = validPoints[0];
                    const lastPoint = validPoints[validPoints.length - 1];
                    return (
                      <View
                        style={[
                          styles.line,
                          {
                            left: lastPoint.x,
                            top: lastPoint.y,
                            width: Math.sqrt(
                              Math.pow(firstPoint.x - lastPoint.x, 2) +
                              Math.pow(firstPoint.y - lastPoint.y, 2)
                            ),
                            transform: [
                              {
                                rotate: `${Math.atan2(
                                  firstPoint.y - lastPoint.y,
                                  firstPoint.x - lastPoint.x
                                )}rad`,
                              },
                            ],
                          },
                        ]}
                      />
                    );
                  }
                  return null;
                })()}
              </View>
            )}
          </View>
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onTouchEnd={handleCameraPress}
          >
            {/* Scanning overlay */}
            <View style={styles.scanOverlay}>
              {/* Grid lines */}
              <View style={styles.gridContainer}>
                {[...Array(5)].map((_, i) => (
                  <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${(i + 1) * 16.66}%` }]} />
                ))}
                {[...Array(5)].map((_, i) => (
                  <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${(i + 1) * 16.66}%` }]} />
                ))}
              </View>
              
              {/* Roof points */}
              {roofPoints.map((point, index) => (
                <View
                  key={index}
                  style={[styles.roofPoint, { left: point.x - 10, top: point.y - 10 }]}
                >
                  <Text style={styles.pointLabel}>{index + 1}</Text>
                </View>
              ))}
            </View>
          </CameraView>
        )}

        {/* Scanning instructions */}
        {isScanning && !demoMode && (
          <View style={styles.instructionBanner}>
            <Ionicons name="information-circle" size={20} color="#f59e0b" />
            <Text style={styles.instructionText}>
              Tap the {4 - roofPoints.length} corners of the roof ({roofPoints.length}/4)
            </Text>
          </View>
        )}
      </View>

      {/* Results Panel */}
      {showResults && scanResult && (
        <ScrollView style={styles.resultsPanel}>
          <View style={styles.resultHeader}>
            <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
            <Text style={styles.resultTitle}>Scan Complete!</Text>
          </View>

          <View style={styles.resultsGrid}>
            <View style={styles.resultCard}>
              <Ionicons name="resize" size={24} color="#3b82f6" />
              <Text style={styles.resultValue}>{scanResult.roofArea.toLocaleString()}</Text>
              <Text style={styles.resultLabel}>Sq Ft Roof</Text>
            </View>
            <View style={styles.resultCard}>
              <Ionicons name="grid" size={24} color="#8b5cf6" />
              <Text style={styles.resultValue}>{scanResult.panelCount}</Text>
              <Text style={styles.resultLabel}>Panels</Text>
            </View>
            <View style={styles.resultCard}>
              <Ionicons name="flash" size={24} color="#f59e0b" />
              <Text style={styles.resultValue}>{scanResult.systemSize} kW</Text>
              <Text style={styles.resultLabel}>System Size</Text>
            </View>
            <View style={styles.resultCard}>
              <Ionicons name="trending-up" size={24} color="#22c55e" />
              <Text style={styles.resultValue}>${scanResult.estimatedSavings.toLocaleString()}</Text>
              <Text style={styles.resultLabel}>Annual Savings</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated System Cost</Text>
              <Text style={styles.summaryValue}>${scanResult.estimatedCost.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payback Period</Text>
              <Text style={styles.summaryValue}>{isNaN(scanResult.paybackYears) || !isFinite(scanResult.paybackYears) ? 'N/A' : `${scanResult.paybackYears} years`}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>25-Year Savings</Text>
              <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
                ${(scanResult.estimatedSavings * 25).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={saveToLead}>
              <Ionicons name="save" size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save to Lead</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={generateShareableLink}
              disabled={isGeneratingShare}
              data-testid="share-qr-btn"
            >
              {isGeneratingShare ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <Ionicons name="qr-code" size={20} color="#22c55e" />
              )}
              <Text style={styles.shareButtonText}>Share QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rescanButton} onPress={resetScan}>
              <Ionicons name="refresh" size={20} color="#f59e0b" />
              <Text style={styles.rescanButtonText}>New Scan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* QR Code Share Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowQRModal(false)}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <Text style={styles.qrModalTitle}>Share Your Estimate</Text>
            <Text style={styles.qrModalSubtitle}>
              Let homeowners scan this QR code to see their savings
            </Text>
            
            <View style={styles.qrContainer}>
              {shareUrl ? (
                <QRCode
                  value={shareUrl}
                  size={200}
                  backgroundColor="#ffffff"
                  color="#0a1628"
                />
              ) : (
                <ActivityIndicator size="large" color="#f59e0b" />
              )}
            </View>
            
            <View style={styles.savingsPreview}>
              <Text style={styles.savingsPreviewLabel}>Annual Savings</Text>
              <Text style={styles.savingsPreviewValue}>
                ${scanResult?.estimatedSavings.toLocaleString()}/year
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.shareNativeButton}
              onPress={handleShare}
              data-testid="share-native-btn"
            >
              <Ionicons name="share-social" size={20} color="#ffffff" />
              <Text style={styles.shareNativeButtonText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Start/Stop Scan Button */}
      {!showResults && (
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonActive]}
            onPress={isScanning ? resetScan : startScan}
          >
            <Ionicons 
              name={isScanning ? 'stop' : 'scan'} 
              size={28} 
              color="#ffffff" 
            />
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Cancel Scan' : 'Start Roof Scan'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  modeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 58, 95, 0.85)',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderStyle: 'dashed',
  },
  camera: {
    flex: 1,
  },
  demoView: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  demoRoof: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '30%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roofShape: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    backgroundColor: '#1e293b',
  },
  demoLabel: {
    position: 'absolute',
    color: '#64748b',
    fontSize: 14,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: 1,
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  roofPoint: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pointLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  linesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  line: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#f59e0b',
    transformOrigin: 'left center',
  },
  instructionBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 95, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  resultsPanel: {
    flex: 1,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  resultCard: {
    width: '47%',
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  resultLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  rescanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a5f',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  rescanButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: '#1e3a5f',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  qrModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  qrModalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  savingsPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  savingsPreviewLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  savingsPreviewValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#22c55e',
  },
  shareNativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  shareNativeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    padding: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  scanButtonActive: {
    backgroundColor: '#ef4444',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  demoButton: {
    backgroundColor: '#1e3a5f',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
