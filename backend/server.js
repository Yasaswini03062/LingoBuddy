import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Gemini API Key is not set in backend/.env file." });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const systemPrompt = `You are my super close best friend. We are just hanging out and chatting naturally. 
Your goal is to help me improve my English speaking skills, but you MUST act exactly like a real human friend.
- Use casual language, everyday slang, and natural expressions (like 'haha', 'omg', 'bro', 'yeah totally', 'no way').
- Keep your replies short, snappy, and conversational. Do NOT write long paragraphs. 
- Ask natural follow-up questions to keep the conversation flowing.
- Show emotions and empathy.

The user will send you messages (transcribed from their speech).
Return your response STRICTLY as a JSON object with two fields:
1. "correction": If I made grammatical, structural, or vocabulary mistakes, provide a gentle, friendly tip explaining the proper structure. If my English was good, return null.
2. "reply": Your best-friend response to what I said.

Make sure your output is valid JSON without any markdown formatting blocks like \`\`\`json.
Example format:
{
  "correction": "Just a quick tip! Instead of saying 'I goes to market', we usually say 'I go to the market'.",
  "reply": "Oh nice! What did you grab at the market? Did you get those snacks we talked about? haha"
}`;

        let promptText = systemPrompt + "\n\nUser Message: " + message;

        const result = await model.generateContent(promptText);
        const responseText = result.response.text();
        
        // Parse the JSON response
        let jsonResponse;
        try {
            // Clean up possible markdown formatting
            let cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            jsonResponse = JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse JSON from AI response:", responseText);
            // Fallback response
            jsonResponse = {
                correction: null,
                reply: responseText
            };
        }

        res.json(jsonResponse);
    } catch (error) {
        console.error("Error communicating with AI:", error);
        res.status(500).json({ error: "Failed to generate response." });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
