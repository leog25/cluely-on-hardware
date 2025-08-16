# Huely

A cross-platform CLI tool that captures webcam screenshots and analyzes them using OpenAI's GPT-4 Vision API. Perfect for solving coding problems, answering questions, and analyzing visual content directly from your screen.

## Features

- **Instant Screen Capture**: Capture screenshots using your webcam with a single command
- **AI-Powered Analysis**: Leverages OpenAI's GPT-4 Vision to understand and answer questions from images
- **Problem Solving**: Automatically detects and solves coding challenges, math problems, and academic questions
- **Language Detection**: Intelligently identifies programming languages in coding problems
- **Cross-Platform**: Works on Windows, Linux, and macOS
- **Secure API Key Storage**: Stores your OpenAI API key securely in your home directory

## Installation

### From npm

```bash
npm install -g huely
```

### From source

```bash
git clone https://github.com/leog25/cluely-on-hardware.git
cd cluely-on-hardware
npm install
npm run build
npm link
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

### Example Use Cases

- **LeetCode Problems**: Capture a coding challenge and get the solution
- **Math Problems**: Photograph equations and get step-by-step solutions
- **Technical Documentation**: Capture and get explanations of complex diagrams
- **Academic Questions**: Screenshot homework problems and get detailed answers

## System Requirements

- **Node.js**: v14.0.0 or higher
- **Operating System**: Windows, Linux, or macOS
- **Architecture**: x64, ARM64, or ARM
- **Webcam**: Required for capturing screenshots

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

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run built version
npm start
```

## Project Structure

```
cluely-on-hardware/
├── src/
│   ├── index.ts           # Main CLI entry point
│   ├── cli-ui.ts          # CLI interface and user interactions
│   ├── webcam-manager.ts  # Cross-platform webcam handling
│   ├── openai-client.ts   # OpenAI API integration
│   └── config.ts          # Configuration management
├── dist/                  # Compiled JavaScript files
├── captures/              # Temporary screenshot storage
└── package.json          
```

## API Usage

The tool uses OpenAI's GPT-4 Vision model (`gpt-4o-mini`) to analyze captured images. Each analysis consumes API tokens based on:
- Image size and complexity
- Response length (max 1500 tokens per response)

## Troubleshooting

### Webcam not found
- Ensure your webcam is properly connected
- Check webcam permissions in your OS settings
- On Linux, verify `fswebcam` is installed

### API Key issues
- Verify your API key is valid at [OpenAI Platform](https://platform.openai.com/)
- Ensure you have sufficient API credits
- Run `huely --setup` to reconfigure

### Image capture fails
- Check the `captures/` directory has write permissions
- Ensure sufficient disk space
- Try running with elevated permissions if necessary

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**leog25** - [GitHub Profile](https://github.com/leog25)

## Acknowledgments

- OpenAI for the powerful GPT-4 Vision API
- The open-source community for the excellent dependencies used in this project

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/leog25/cluely-on-hardware/issues) on GitHub.