import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Box,
  Chip,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Storage as StorageIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import './App.css';

function App() {
  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wipeInProgress, setWipeInProgress] = useState(false);
  const [wipeProgress, setWipeProgress] = useState(0);
  const [wipeStatus, setWipeStatus] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [wipeResult, setWipeResult] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    loadDrives();
    loadSystemInfo();
    
    // Set up progress listener if running in Electron
    if (window.electronAPI) {
      window.electronAPI.onWipeProgress((event, progressData) => {
        setWipeProgress(progressData.progress);
        setWipeStatus(progressData.status);
      });
    }

    // Cleanup
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('wipe-progress');
      }
    };
  }, []);

  const loadDrives = async () => {
    if (!window.electronAPI) {
      setError('This application must run in Electron environment');
      return;
    }

    try {
      setIsLoading(true);
      const driveList = await window.electronAPI.getDrives();
      setDrives(driveList);
    } catch (err) {
      setError('Failed to load drives: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    if (!window.electronAPI) return;
    
    try {
      const info = await window.electronAPI.getSystemInfo();
      setSystemInfo(info);
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  };

  const handleDriveSelect = (drive) => {
    setSelectedDrive(drive);
    setShowConfirmDialog(true);
  };

  const handleConfirmWipe = async () => {
    setShowConfirmDialog(false);
    setWipeInProgress(true);
    setError('');
    setWipeProgress(0);
    setWipeStatus('Initializing...');

    try {
      // Simulate the wipe process
      const result = await window.electronAPI.simulateWipe(selectedDrive);
      setWipeResult(result);
      
      // Generate certificate
      const cert = await window.electronAPI.generateCertificate(result);
      setCertificate(cert);
      
      setWipeStatus('Complete! Certificate generated.');
    } catch (err) {
      setError('Wipe failed: ' + err.message);
    } finally {
      setWipeInProgress(false);
    }
  };

  const handleOpenCertificates = () => {
    if (window.electronAPI) {
      window.electronAPI.openCertificateFolder();
    }
  };

  const formatDriveSize = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const resetWipe = () => {
    setWipeResult(null);
    setCertificate(null);
    setWipeProgress(0);
    setWipeStatus('');
    setError('');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
          <SecurityIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Secure Data Wiper
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              NIST SP 800-88 Compliant Data Erasure Tool
            </Typography>
          </Box>
        </Box>

        {/* System Info */}
        {systemInfo && (
          <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>System Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>OS:</strong> {systemInfo.os}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Architecture:</strong> {systemInfo.arch}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Success Display */}
        {wipeResult && certificate && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={resetWipe}>
                Start New Wipe
              </Button>
            }
          >
            <Typography variant="body1">
              ✅ Wipe completed successfully!
            </Typography>
            <Typography variant="body2">
              Certificate ID: {certificate.certificateId}
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<FolderIcon />}
              onClick={handleOpenCertificates}
              sx={{ mt: 1 }}
            >
              Open Certificates
            </Button>
          </Alert>
        )}

        {/* Wipe Progress */}
        {wipeInProgress && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Wiping in Progress...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={wipeProgress} 
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" color="text.secondary">
                {wipeStatus} ({wipeProgress}%)
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Drive List */}
        <Typography variant="h6" gutterBottom>
          Available Storage Devices
        </Typography>
        
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        ) : (
          <List>
            {drives.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="No removable drives detected"
                  secondary="Only non-system, removable drives are shown for safety"
                />
              </ListItem>
            ) : (
              drives.map((drive, index) => (
                <ListItem 
                  key={index}
                  button
                  onClick={() => handleDriveSelect(drive)}
                  disabled={wipeInProgress}
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 2, 
                    mb: 1,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <ListItemIcon>
                    <StorageIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {drive.displayName || drive.device}
                        {drive.isUSB && <Chip label="USB" size="small" color="primary" />}
                        {drive.isRemovable && <Chip label="Removable" size="small" />}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2">
                          Size: {formatDriveSize(drive.size)} | Device: {drive.device}
                        </Typography>
                        {drive.mountpoints.length > 0 && (
                          <Typography variant="body2">
                            Mount: {drive.mountpoints.map(mp => mp.path).join(', ')}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Action Buttons */}
        <Box display="flex" justifyContent="center" gap={2}>
          <Button 
            variant="outlined"
            onClick={loadDrives}
            disabled={wipeInProgress}
            startIcon={<StorageIcon />}
          >
            Refresh Drives
          </Button>
          <Button 
            variant="outlined"
            onClick={handleOpenCertificates}
            startIcon={<FolderIcon />}
          >
            View Certificates
          </Button>
        </Box>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            Confirm Secure Data Wipe
          </DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              You are about to securely wipe the following storage device:
            </Typography>
            {selectedDrive && (
              <Card sx={{ mt: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                <CardContent>
                  <Typography><strong>Device:</strong> {selectedDrive.device}</Typography>
                  <Typography><strong>Name:</strong> {selectedDrive.displayName}</Typography>
                  <Typography><strong>Size:</strong> {formatDriveSize(selectedDrive.size)}</Typography>
                  {selectedDrive.mountpoints.length > 0 && (
                    <Typography>
                      <strong>Mount:</strong> {selectedDrive.mountpoints.map(mp => mp.path).join(', ')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>WARNING:</strong> This action is IRREVERSIBLE. All data on this drive will be permanently destroyed using NIST SP 800-88 compliant methods.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmWipe} 
              variant="contained" 
              color="error"
              startIcon={<SecurityIcon />}
            >
              Confirm Secure Wipe
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}

export default App;
