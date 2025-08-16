import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { highlight } from 'cli-highlight';

export class CLIUI {
  private rl: readline.Interface | null = null;

  constructor() {
    this.setupReadline();
  }

  private setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false  // Disable terminal features to prevent echo
    });

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    // Prevent the process from exiting
    process.stdin.resume();
  }

  showWelcome() {
    console.clear();
    console.log(chalk.cyan.bold('\n╔══════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║          HUELY - Webcam AI          ║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════╝\n'));
    console.log(chalk.gray('Capture webcam screenshots and analyze with OpenAI\n'));
  }

  showInstructions() {
    console.log(chalk.yellow('\n📸 Controls:'));
    console.log(chalk.white('  • Press SPACE to capture and analyze'));
    console.log(chalk.white('  • Press W to switch webcam'));
    console.log(chalk.white('  • Press K to configure API key'));
    console.log(chalk.white('  • Press Q to quit'));
    console.log(chalk.white('  • Press C to clear screen'));
    console.log(chalk.gray('\n────────────────────────────────────────\n'));
  }

  async selectWebcam(devices: Array<{name: string, id: string}>): Promise<string> {
    if (devices.length === 0) {
      console.log(chalk.red('No webcams detected!'));
      throw new Error('No webcams available');
    }

    if (devices.length === 1) {
      console.log(chalk.green(`✓ Using: ${devices[0].name}`));
      return devices[0].id;
    }

    const { selectedDevice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedDevice',
        message: 'Select a webcam:',
        choices: devices.map(d => ({
          name: d.name,
          value: d.id
        }))
      }
    ]);

    return selectedDevice;
  }

  showCapturing(): any {
    return ora({
      text: 'Capturing image...',
      spinner: 'dots'
    }).start();
  }

  showAnalyzing(): any {
    return ora({
      text: 'Analyzing with OpenAI...',
      spinner: 'dots'
    }).start();
  }

  showResponse(response: string) {
    console.log(chalk.green('\n✨ AI Analysis:'));
    console.log(chalk.white('────────────────────────────────────────'));
    
    // Parse response for code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
      // Print text before code block
      const textBefore = response.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        textBefore.split('\n').forEach(line => {
          console.log(chalk.white(line));
        });
      }
      
      // Extract language and code
      const language = match[1] || 'javascript';
      const code = match[2];
      
      // Print syntax highlighted code
      console.log(chalk.gray('\n--- Code ---'));
      try {
        const highlighted = highlight(code, { language: language.toLowerCase() });
        console.log(highlighted);
      } catch (err) {
        // Fallback to plain code if highlighting fails
        console.log(chalk.cyan(code));
      }
      console.log(chalk.gray('------------\n'));
      
      lastIndex = match.index + match[0].length;
    }
    
    // Print remaining text after last code block
    const remainingText = response.slice(lastIndex);
    if (remainingText.trim()) {
      remainingText.split('\n').forEach(line => {
        console.log(chalk.white(line));
      });
    }
    
    console.log(chalk.white('────────────────────────────────────────\n'));
  }

  showError(message: string) {
    console.log(chalk.red(`\n❌ Error: ${message}\n`));
  }

  showSuccess(message: string) {
    console.log(chalk.green(`\n✓ ${message}\n`));
  }

  clearScreen() {
    console.clear();
    this.showWelcome();
    this.showInstructions();
  }

  async waitForKeypress(): Promise<string> {
    return new Promise((resolve) => {
      const handler = (chunk: Buffer) => {
        // Handle Ctrl+C immediately
        if (chunk[0] === 0x03) {
          resolve('quit');
          return;
        }
        
        const key = chunk.toString();
        
        if (key === 'q' || key === 'Q') {
          resolve('quit');
        } else if (key === ' ') {
          resolve('capture');
        } else if (key === 'c' || key === 'C') {
          resolve('clear');
        } else if (key === 'w' || key === 'W') {
          resolve('switch');
        } else if (key === 'k' || key === 'K') {
          resolve('config');
        } else {
          // For any other key (including backspace), re-attach the listener
          process.stdin.once('data', handler);
        }
      };

      // Keep stdin in raw mode and listening
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.once('data', handler);
    });
  }

  async promptApiKey(): Promise<string> {
    // Temporarily disable raw mode for input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your OpenAI API key:',
        mask: '*',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'API key cannot be empty';
          }
          if (!input.startsWith('sk-')) {
            return 'Invalid API key format (should start with sk-)';
          }
          return true;
        }
      }
    ]);
    
    // Re-enable raw mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }
    
    return apiKey;
  }

  cleanup() {
    if (this.rl) {
      this.rl.close();
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  }
}