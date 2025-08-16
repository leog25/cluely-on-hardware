#!/usr/bin/env node

// Suppress deprecation and experimental warnings
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' || warning.name === 'ExperimentalWarning') {
    return; // Ignore these warnings
  }
  console.warn(warning); // Show other warnings
});

import * as dotenv from 'dotenv';
import { WebcamManager } from './webcam';
import { OpenAIClient } from './openai-client';
import { CLIUI } from './cli-ui';
import { ConfigManager } from './config';
import chalk from 'chalk';

dotenv.config();

class HuelyCLI {
  private webcamManager: WebcamManager;
  private openaiClient: OpenAIClient | null = null;
  private ui: CLIUI;
  private config: ConfigManager;
  private isRunning: boolean = true;

  constructor() {
    this.webcamManager = new WebcamManager();
    this.ui = new CLIUI();
    this.config = new ConfigManager();
  }

  async initializeOpenAI() {
    // Try to get API key from config first, then from environment
    let apiKey = this.config.getApiKey() || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log(chalk.yellow('\n⚠️  OpenAI API key not configured'));
      console.log(chalk.white('Press K to configure your API key, or set OPENAI_API_KEY environment variable\n'));
      return false;
    }
    
    try {
      this.openaiClient = new OpenAIClient(apiKey);
      return true;
    } catch (error) {
      console.error(chalk.red('Failed to initialize OpenAI client'));
      return false;
    }
  }

  async initialize() {
    try {
      this.ui.showWelcome();
      
      await this.selectAndInitializeWebcam();
      await this.initializeOpenAI();
      
      this.ui.showInstructions();
      this.ui.showSuccess('Webcam initialized! Ready to capture.');
      
    } catch (error) {
      this.ui.showError(`Failed to initialize: ${error}`);
      process.exit(1);
    }
  }

  async selectAndInitializeWebcam() {
    const devices = await this.webcamManager.listDevices();
    const selectedDevice = await this.ui.selectWebcam(devices);
    this.webcamManager.initializeWebcam(selectedDevice);
  }

  async captureAndAnalyze() {
    try {
      if (!this.openaiClient) {
        this.ui.showError('OpenAI API key not configured. Press K to set it up.');
        return;
      }
      
      const captureSpinner = this.ui.showCapturing();
      let imagePath: string | null = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      // Retry logic for black frames (common on Raspberry Pi)
      while (!imagePath && retryCount < maxRetries) {
        try {
          imagePath = await this.webcamManager.captureImage();
          captureSpinner.succeed(`Image captured!`);
        } catch (captureError: any) {
          retryCount++;
          if (captureError.message.includes('black') && retryCount < maxRetries) {
            captureSpinner.text = `Camera warming up... Retry ${retryCount}/${maxRetries}`;
            // Wait a bit longer between retries for camera to stabilize
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            captureSpinner.fail(`Capture failed: ${captureError.message}`);
            throw captureError;
          }
        }
      }
      
      if (!imagePath) {
        throw new Error('Failed to capture image after multiple attempts');
      }
      
      const analyzeSpinner = this.ui.showAnalyzing();
      const analysis = await this.openaiClient.analyzeImage(imagePath);
      analyzeSpinner.succeed('Analysis complete!');
      
      this.ui.showResponse(analysis);
      
    } catch (error: any) {
      this.ui.showError(`Failed to capture/analyze: ${error.message || error}`);
    }
  }

  async configureApiKey() {
    console.log(chalk.yellow('\n🔑 API Key Configuration'));
    
    const apiKey = await this.ui.promptApiKey();
    this.config.setApiKey(apiKey);
    
    const success = await this.initializeOpenAI();
    if (success) {
      this.ui.showSuccess('API key configured successfully!');
    } else {
      this.ui.showError('Failed to configure API key');
    }
  }

  async run() {
    await this.initialize();
    
    console.log(chalk.gray('\nListening for commands...'));
    
    while (this.isRunning) {
      const key = await this.ui.waitForKeypress();
      
      switch(key) {
        case 'quit':
          this.isRunning = false;
          break;
        case 'capture':
          await this.captureAndAnalyze();
          console.log(chalk.gray('Listening for commands...'));
          break;
        case 'clear':
          this.ui.clearScreen();
          console.log(chalk.gray('Listening for commands...'));
          break;
        case 'switch':
          console.log(chalk.yellow('🔄 Switching webcam...'));
          await this.selectAndInitializeWebcam();
          this.ui.showSuccess('Webcam switched successfully!');
          console.log(chalk.gray('Listening for commands...'));
          break;
        case 'config':
          await this.configureApiKey();
          console.log(chalk.gray('Listening for commands...'));
          break;
      }
    }
    
    this.cleanup();
  }

  cleanup() {
    console.log(chalk.yellow('\n👋 Goodbye!'));
    this.webcamManager.cleanup();
    this.ui.cleanup();
    process.exit(0);
  }
}

async function main() {
  // Check for version flag
  const args = process.argv.slice(2);
  if (args.includes('--version') || args.includes('-v')) {
    const packageJson = require('../package.json');
    console.log(`huely v${packageJson.version}`);
    process.exit(0);
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
huely - Webcam AI CLI Tool

Usage: huely [options]

Options:
  -v, --version  Show version number
  -h, --help     Show help

Controls:
  SPACE  Capture and analyze
  W      Switch webcam  
  K      Configure API key
  C      Clear screen
  Q      Quit
    `);
    process.exit(0);
  }

  const app = new HuelyCLI();
  
  process.on('SIGINT', () => {
    app.cleanup();
  });
  
  process.on('SIGTERM', () => {
    app.cleanup();
  });
  
  try {
    await app.run();
  } catch (error) {
    console.error(chalk.red(`\nFatal error: ${error}`));
    process.exit(1);
  }
}

main().catch(console.error);