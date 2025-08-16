# Huely

## Installation

### From npm

```bash
npm install -g huely
```

## Setup

1. **Get an OpenAI API Key**
   - Sign up at [OpenAI](https://platform.openai.com/)
   - Navigate to API keys section
   - Create a new API key

2. **Configure Huely**
   ```bash
   huely --setup
   ```
   Enter your OpenAI API key when prompted. It will be securely stored in `~/.huely/config.json`

## Usage

### Basic Commands

```bash
# Capture and analyze a screenshot
huely

# Setup or update API key
huely --setup

# Clear stored API key
huely --clear

# Show version
huely --version

# Show help
huely --help
```

### Workflow

1. Run `huely` in your terminal
2. Position the content you want to analyze on your screen
3. Press **Enter** to capture
4. Huely will analyze the image and provide:
   - Solutions to coding problems
   - Answers to questions
   - Explanations of visual content
   - Complete code implementations with complexity analysis

### Platform-Specific Notes

**Windows**: Uses `CommandCam.exe` for webcam capture

**Linux**: Requires `fswebcam` package
```bash
sudo apt-get install fswebcam  # Debian/Ubuntu
sudo yum install fswebcam      # RHEL/CentOS
```

**macOS**: Uses `imagesnap` (automatically handled)

## Configuration

Configuration is stored in `~/.huely/config.json`:

```json
{
  "openaiApiKey": "your-api-key-here"
}
```

