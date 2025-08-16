import * as NodeWebcam from 'node-webcam';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
const { Jimp } = require('jimp');

export interface WebcamDevice {
  name: string;
  id: string;
}

export class WebcamManager {
  private webcam: any;
  private capturesDir: string;

  constructor() {
    // Use system temp directory instead of creating a captures folder
    this.capturesDir = path.join(os.tmpdir(), 'huely-captures');
    if (!fs.existsSync(this.capturesDir)) {
      fs.mkdirSync(this.capturesDir, { recursive: true });
    }
  }

  async getCameraNames(): Promise<string[]> {
    return new Promise((resolve) => {
      const platform = process.platform;
      let command: string;
      
      if (platform === 'win32') {
        // Windows: Use PowerShell
        command = `powershell -Command "Get-PnpDevice -Class Camera -Status OK | Select-Object -ExpandProperty FriendlyName"`;
      } else if (platform === 'linux') {
        // Linux: Use v4l2-ctl
        command = `v4l2-ctl --list-devices 2>/dev/null | grep -E "^[^\\t]" | sed 's/:$//'`;
      } else if (platform === 'darwin') {
        // macOS: Use system_profiler
        command = `system_profiler SPCameraDataType | grep "Model ID:" | sed 's/.*Model ID: //'`;
      } else {
        resolve([]);
        return;
      }
      
      exec(command, (error, stdout, stderr) => {
        if (error || stderr) {
          // Fallback to empty array if command fails
          resolve([]);
        } else {
          const names = stdout.trim().split('\n').filter(name => name.trim());
          resolve(names);
        }
      });
    });
  }

  async listDevices(): Promise<WebcamDevice[]> {
    return new Promise(async (resolve, reject) => {
      // For Linux, always provide available video devices
      if (process.platform === 'linux') {
        const devices: WebcamDevice[] = [];
        
        // Check for /dev/video* devices
        for (let i = 0; i < 10; i++) {
          if (fs.existsSync(`/dev/video${i}`)) {
            devices.push({
              name: `USB Camera (video${i})`,
              id: i.toString()
            });
          }
        }
        
        if (devices.length > 0) {
          resolve(devices);
          return;
        }
      }
      
      // Fallback to original detection for Windows/Mac
      const cameraNames = await this.getCameraNames();
      
      NodeWebcam.list((list: string[]) => {
        if (!list || list.length === 0) {
          const simulatedDevices: WebcamDevice[] = [
            { name: 'Default Camera', id: '0' }
          ];
          resolve(simulatedDevices);
        } else {
          const devices: WebcamDevice[] = list.map((device, index) => {
            // Try to use actual camera name if available
            let deviceName = cameraNames[index] || '';
            
            if (!deviceName) {
              // Fallback to generic name if we couldn't get the actual name
              deviceName = device ? `Webcam ${parseInt(device) + 1} (Device ${device})` : `Camera ${index + 1}`;
            }
            
            return {
              name: deviceName,
              id: device || index.toString()
            };
          });
          resolve(devices);
        }
      });
    });
  }

  initializeWebcam(deviceId: string) {
    const opts: any = {
      width: 1280,
      height: 720,
      quality: 100,  // Maximum quality for best AI analysis
      delay: 0,
      saveShots: true,
      output: "jpeg",
      device: deviceId,
      callbackReturn: "location",
      verbose: false
    };

    // Linux-specific settings (including Raspberry Pi)
    if (process.platform === 'linux') {
      // fswebcam expects the device path directly
      opts.device = `/dev/video${deviceId}`;
      // Add skip frames to allow camera to warm up (critical for Raspberry Pi)
      opts.skip = 20;  // Skip first 20 frames to let camera adjust
      // Add delay for camera initialization
      opts.delay = 1;  // 1 second delay
      // Set specific fswebcam options
      opts.setValues = {
        brightness: 60,
        contrast: 15,
        gamma: 100
      };
    }

    this.webcam = NodeWebcam.create(opts);
  }

  async captureImage(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      // Generate unique ID with timestamp and random component to prevent collisions
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const uniqueId = `${timestamp}_${randomId}`;
      
      // Clear old captures before taking new one
      this.clearOldCaptures();
      
      // On Linux, fswebcam needs the full filename with extension
      const tempFilename = process.platform === 'linux' 
        ? `capture_temp_${uniqueId}.jpg`  
        : `capture_temp_${uniqueId}`;
      const tempFilepath = path.join(this.capturesDir, tempFilename);
      const finalFilename = `capture_${uniqueId}.jpeg`;
      const finalFilepath = path.join(this.capturesDir, finalFilename);

      // Ensure the captures directory exists
      if (!fs.existsSync(this.capturesDir)) {
        fs.mkdirSync(this.capturesDir, { recursive: true });
      }

      this.webcam.capture(tempFilepath, async (err: Error, data: string) => {
        if (err) {
          reject(err);
        } else {
          try {
            // node-webcam returns the path where the image was saved
            let capturedPath = data || tempFilepath;
            
            // Check for various possible extensions with unique ID
            if (!fs.existsSync(capturedPath)) {
              // Try without extension first, but only for files with our unique ID
              const baseFilepath = tempFilepath.replace(/\.(jpg|jpeg|bmp|ppm|png)$/i, '');
              const extensions = ['.jpg', '.jpeg', '.bmp', '.ppm', '.png', ''];
              for (const ext of extensions) {
                const tryPath = baseFilepath + ext;
                if (fs.existsSync(tryPath) && tryPath.includes(uniqueId)) {
                  capturedPath = tryPath;
                  break;
                }
              }
            }
            
            if (!fs.existsSync(capturedPath)) {
              // List all files in captures directory for debugging
              const files = fs.readdirSync(this.capturesDir);
              throw new Error(`Captured image not found. Looked for: ${capturedPath} with ID: ${uniqueId}. Files in dir: ${files.join(', ')}`);
            }
            
            // Validate that the captured file was created recently (within last 5 seconds)
            const captureStats = fs.statSync(capturedPath);
            const fileAge = Date.now() - captureStats.mtimeMs;
            if (fileAge > 5000) {
              throw new Error(`Captured image appears to be stale (${fileAge}ms old). This might be a previous capture.`);
            }
            
            // Check what format was actually captured
            const buffer = fs.readFileSync(capturedPath);
            const isBmp = buffer[0] === 0x42 && buffer[1] === 0x4D;
            const isPpm = buffer[0] === 0x50 && buffer[1] === 0x36; // PPM format (common on Linux)
            
            if (isBmp || isPpm) {
              // Convert BMP/PPM to JPEG using Jimp silently
              const image = await Jimp.read(capturedPath);
              await image.write(finalFilepath);
              
              // Remove the temporary file
              fs.unlinkSync(capturedPath);
              
              // Check if the converted image is black
              const finalBuffer = fs.readFileSync(finalFilepath);
              if (this.isImageBlack(finalBuffer)) {
                throw new Error('Captured image appears to be black. Camera may need more warm-up time.');
              }
              
              resolve(finalFilepath);
            } else {
              // If it's already JPEG or other format, check if it's black
              if (this.isImageBlack(buffer)) {
                // Remove the black image
                fs.unlinkSync(capturedPath);
                throw new Error('Captured image appears to be black. Camera may need more warm-up time.');
              }
              
              // Rename to final path
              fs.renameSync(capturedPath, finalFilepath);
              resolve(finalFilepath);
            }
          } catch (error) {
            reject(new Error(`Failed to process captured image: ${error}`));
          }
        }
      });
    });
  }

  private isImageBlack(buffer: Buffer): boolean {
    // Check if image is mostly black (common issue with webcams on Raspberry Pi)
    // Sample the first 1000 bytes after header
    const sampleSize = Math.min(1000, buffer.length - 100);
    let blackPixels = 0;
    
    // Skip JPEG header (usually first 100 bytes)
    for (let i = 100; i < 100 + sampleSize; i++) {
      if (buffer[i] < 20) {  // Very dark pixel
        blackPixels++;
      }
    }
    
    // If more than 90% of sampled pixels are black, image is likely black
    return (blackPixels / sampleSize) > 0.9;
  }

  async captureImageAsBase64(): Promise<string> {
    const imagePath = await this.captureImage();
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  }

  private clearOldCaptures() {
    // Clear captures older than 30 seconds to prevent using stale images
    if (!fs.existsSync(this.capturesDir)) {
      return;
    }
    
    const files = fs.readdirSync(this.capturesDir);
    const now = Date.now();
    const thirtySeconds = 30 * 1000;

    files.forEach(file => {
      if (file.startsWith('capture_')) {
        const filePath = path.join(this.capturesDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > thirtySeconds) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          // Ignore errors when cleaning up
        }
      }
    });
  }

  cleanup() {
    const files = fs.readdirSync(this.capturesDir);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(this.capturesDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > fiveMinutes) {
        fs.unlinkSync(filePath);
      }
    });
  }
}