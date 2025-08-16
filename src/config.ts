import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ConfigManager {
  private configPath: string;
  private config: any;

  constructor() {
    // Store config in user's home directory
    const configDir = path.join(os.homedir(), '.huely');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    this.configPath = path.join(configDir, 'config.json');
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(data);
      } else {
        this.config = {};
      }
    } catch (error) {
      this.config = {};
    }
  }

  private saveConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  getApiKey(): string | null {
    return this.config.openaiApiKey || null;
  }

  setApiKey(apiKey: string) {
    this.config.openaiApiKey = apiKey;
    this.saveConfig();
  }

  clearApiKey() {
    delete this.config.openaiApiKey;
    this.saveConfig();
  }
}