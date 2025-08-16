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

  async getWindowsCameraNames(): Promise<string[]> {
    return new Promise((resolve) => {
      // Use PowerShell to get camera names on Windows
      const command = `powershell -Command "Get-PnpDevice -Class Camera -Status OK | Select-Object -ExpandProperty FriendlyName"`;
      
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
      // First get the actual camera names from Windows
      const cameraNames = await this.getWindowsCameraNames();
      
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
      quality: 100,
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
            const capturedPath = data || tempFilepath;
            
            // Check what format was actually captured
            const buffer = fs.readFileSync(capturedPath);
            const isBmp = buffer[0] === 0x42 && buffer[1] === 0x4D;
            
            if (isBmp) {
              console.log('Converting BMP to JPEG...');
              // Convert BMP to JPEG using Jimp
              const image = await Jimp.read(capturedPath);
              await image.write(finalFilepath);
              
              // Remove the temporary BMP file
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