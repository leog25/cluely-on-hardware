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
      // First get the actual camera names from the OS
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
    const opts = {
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

    this.webcam = NodeWebcam.create(opts);
  }

  async captureImage(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const timestamp = Date.now();
      const tempFilename = `capture_temp_${timestamp}`;
      const tempFilepath = path.join(this.capturesDir, tempFilename);
      const finalFilename = `capture_${timestamp}.jpeg`;
      const finalFilepath = path.join(this.capturesDir, finalFilename);

      this.webcam.capture(tempFilepath, async (err: Error, data: string) => {
        if (err) {
          reject(err);
        } else {
          try {
            // node-webcam returns the path where the image was saved
            let capturedPath = data || tempFilepath;
            
            // Check for various possible extensions
            if (!fs.existsSync(capturedPath)) {
              // Try with common extensions
              const extensions = ['.jpg', '.jpeg', '.bmp', '.ppm', '.png'];
              for (const ext of extensions) {
                if (fs.existsSync(tempFilepath + ext)) {
                  capturedPath = tempFilepath + ext;
                  break;
                }
              }
            }
            
            // If still not found, check if data has the full path
            if (!fs.existsSync(capturedPath) && data && fs.existsSync(data)) {
              capturedPath = data;
            }
            
            if (!fs.existsSync(capturedPath)) {
              throw new Error(`Captured image not found. Tried: ${capturedPath}`);
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
              
              resolve(finalFilepath);
            } else {
              // If it's already JPEG or other format, just rename it
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

  async captureImageAsBase64(): Promise<string> {
    const imagePath = await this.captureImage();
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
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