import OpenAI from 'openai';
import * as fs from 'fs';

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey
    });
  }

  async analyzeImage(imagePath: string, prompt?: string): Promise<string> {
    try {
      // Ensure the file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      const imageBuffer = fs.readFileSync(imagePath);
      
      // Check if the buffer has content
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Captured image file is empty');
      }

      // Verify the image is a valid JPEG (should be after conversion)
      const isJpeg = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8;
      
      if (!isJpeg) {
        throw new Error('Image is not in JPEG format after conversion');
      }

      const base64Image = imageBuffer.toString('base64');

      const systemPrompt = `You are a helpful assistant that analyzes screenshots. 
      
      If the image contains:
      - A question (academic, technical, or general)
      - A coding problem or LeetCode-style challenge
      - A math problem
      - Any prompt requesting a solution or answer
      
      Then provide a clear, direct answer or solution. For coding problems:
      1. IMPORTANT: Check the image for language indicators:
         - Look for language selection dropdowns/buttons (e.g., "Python3", "Java", "C++", "JavaScript")
         - Check for file extensions (.py, .java, .cpp, .js, etc.)
         - Look for language-specific syntax already present
         - Check problem tags or headers mentioning a language
      2. Use the language shown in the image. If no language is specified, use Python
      3. Provide a brief explanation of the approach
      4. Give the complete solution code in the detected/specified language
      5. Include time and space complexity analysis if relevant
      
      If the image doesn't contain a question, simply describe what you see.`;

      const userPrompt = prompt || "Analyze this image. If it contains a question or problem, provide the answer or solution. Pay special attention to any programming language specified or selected in the image.";

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || "No response from OpenAI";
    } catch (error: any) {
      throw new Error(`Failed to analyze image: ${error.message || error}`);
    }
  }
}