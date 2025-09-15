const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Always load Vite dev server
  mainWindow.loadURL('http://localhost:5173');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle('get-drives', async () => {
  try {
    // Mock drives for prototype
    return [
      {
        device: 'USB_DRIVE_1',
        displayName: 'USB Drive (8GB)',
        description: 'SanDisk USB 3.0',
        size: 8000000000,
        mountpoints: [{ path: 'E:\\' }],
        isRemovable: true,
        isUSB: true
      },
      {
        device: 'USB_DRIVE_2', 
        displayName: 'External HDD (1TB)',
        description: 'Seagate Portable',
        size: 1000000000000,
        mountpoints: [{ path: 'F:\\' }],
        isRemovable: true,
        isUSB: false
      }
    ];
  } catch (error) {
    console.error('Error fetching drives:', error);
    return [];
  }
});

ipcMain.handle('get-system-info', async () => {
  try {
    return {
      manufacturer: 'Mock System',
      model: 'Development Machine',
      os: 'Windows 11',
      arch: 'x64',
      hostname: 'DEV-PC'
    };
  } catch (error) {
    console.error('Error fetching system info:', error);
    return { error: error.message };
  }
});

ipcMain.handle('simulate-wipe', async (event, driveInfo) => {
  try {
    const totalSteps = 5;
    
    for (let step = 1; step <= totalSteps; step++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const progress = Math.round((step / totalSteps) * 100);
      
      event.sender.send('wipe-progress', {
        progress,
        status: getWipeStatus(step),
        currentStep: step,
        totalSteps
      });
    }

    const wipeResult = {
      driveId: driveInfo.device,
      driveName: driveInfo.displayName,
      size: driveInfo.size,
      status: 'completed',
      timestamp: new Date().toISOString(),
      method: 'NIST-SP-800-88-Clear',
      passes: 1,
      verificationHash: crypto.randomBytes(32).toString('hex'),
      duration: '5 seconds'
    };

    return wipeResult;
  } catch (error) {
    console.error('Wipe simulation error:', error);
    throw new Error('Wipe failed: ' + error.message);
  }
});

ipcMain.handle('generate-certificate', async (event, wipeData) => {
  try {
    const certificateId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const certDir = path.join(__dirname, 'certificates');
    await fs.ensureDir(certDir);
    
    const certificateData = {
      id: certificateId,
      version: '1.0',
      timestamp: timestamp,
      device: {
        id: wipeData.driveId,
        name: wipeData.driveName,
        size: wipeData.size
      },
      wipe: {
        method: wipeData.method,
        passes: wipeData.passes,
        status: wipeData.status,
        duration: wipeData.duration,
        verificationHash: wipeData.verificationHash
      },
      compliance: {
        standard: 'NIST-SP-800-88',
        level: 'Clear'
      }
    };

    // Generate JSON certificate
    const jsonPath = path.join(certDir, `wipe-cert-${certificateId}.json`);
    await fs.writeJSON(jsonPath, certificateData, { spaces: 2 });

    // Generate PDF certificate
    const pdfPath = path.join(certDir, `wipe-cert-${certificateId}.pdf`);
    await generatePDFCertificate(certificateData, pdfPath);

    return {
      certificateId,
      jsonPath,
      pdfPath,
      data: certificateData
    };
  } catch (error) {
    console.error('Certificate generation error:', error);
    throw new Error('Failed to generate certificate: ' + error.message);
  }
});

ipcMain.handle('open-certificate-folder', async () => {
  const certDir = path.join(__dirname, 'certificates');
  await fs.ensureDir(certDir);
  shell.openPath(certDir);
});

// Helper Functions
function getWipeStatus(step) {
  const statuses = [
    'Initializing secure wipe...',
    'Detecting drive sectors...',
    'Performing secure overwrite...',
    'Verifying data erasure...',
    'Generating certificate...'
  ];
  return statuses[step - 1] || 'Processing...';
}

async function generatePDFCertificate(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(fs.createWriteStream(outputPath));

      // Header
      doc.fontSize(20)
         .text('SECURE DATA WIPE CERTIFICATE', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12)
         .text('NIST SP 800-88 Compliant Data Sanitization', { align: 'center' });

      // Certificate Info
      doc.moveDown(2);
      doc.fontSize(14).text('Certificate Information:', { underline: true });
      doc.fontSize(11)
         .text(`Certificate ID: ${data.id}`)
         .text(`Generated: ${new Date(data.timestamp).toLocaleString()}`)
         .text(`Version: ${data.version}`);

      // Device Info
      doc.moveDown();
      doc.fontSize(14).text('Device Information:', { underline: true });
      doc.fontSize(11)
         .text(`Device: ${data.device.id}`)
         .text(`Name: ${data.device.name}`)
         .text(`Size: ${(data.device.size / 1024 / 1024 / 1024).toFixed(2)} GB`);

      // Wipe Details
      doc.moveDown();
      doc.fontSize(14).text('Wipe Details:', { underline: true });
      doc.fontSize(11)
         .text(`Method: ${data.wipe.method}`)
         .text(`Passes: ${data.wipe.passes}`)
         .text(`Status: ${data.wipe.status}`)
         .text(`Duration: ${data.wipe.duration}`)
         .text(`Verification Hash: ${data.wipe.verificationHash}`);

      // Compliance
      doc.moveDown();
      doc.fontSize(14).text('Compliance:', { underline: true });
      doc.fontSize(11)
         .text(`Standard: ${data.compliance.standard}`)
         .text(`Level: ${data.compliance.level}`);

      doc.end();
      
      doc.on('end', resolve);
      doc.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}
