import { Tw2GemServer } from '../packages/tw2gem-server/dist/index.js';
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables from .env file
dotenv.config({ path: '../.env' });

const PORT = parseInt(process.env.PORT || '12001', 10);

const server = new Tw2GemServer({
    serverOptions: {
        port: PORT
    },
    geminiOptions: {
        server: {
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        },
        setup: {
            model: 'models/gemini-2.0-flash-live-001',
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Puck'
                        }
                    },
                    languageCode: 'en-US'
                },
            },
            systemInstruction: {
                parts: [{ text: 'You are a professional AI assistant for customer service calls. IMPORTANT: You MUST speak first immediately when the call connects. Start with a warm greeting like "Hello! Thank you for calling. How can I help you today?" Be helpful, polite, and efficient. Always initiate the conversation.' }]
            },
            tools: []
        }
    }
});

server.onNewCall = (socket) => {
    console.log('New call from Twilio:', socket.twilioStreamSid);
};

server.geminiLive.onReady = (socket) => {
    console.log('Gemini Live connection is ready for call:', socket.twilioStreamSid);
    
    // Send initial greeting to ensure Gemini speaks first
    setTimeout(() => {
        if (socket.geminiLive && socket.geminiLive.readyState === 1) {
            const initialMessage = {
                client_content: {
                    turns: [{
                        role: 'user',
                        parts: [{ text: 'Please greet the caller now. Say hello and ask how you can help them today.' }]
                    }],
                    turn_complete: true
                }
            };
            socket.geminiLive.send(JSON.stringify(initialMessage));
            console.log('Sent initial greeting prompt to Gemini for call:', socket.twilioStreamSid);
        }
    }, 500); // Small delay to ensure connection is stable
};

server.geminiLive.onClose = (socket) => {
    console.log('Gemini Live connection closed for call:', socket.twilioStreamSid);
};

server.onError = (socket, event) => {
    console.error('Server error:', event);
};

server.onClose = (socket, event) => {
    console.log('Call ended:', socket.twilioStreamSid);
};

// Add health check endpoint
const app = express();
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured'
    });
});

app.listen(PORT + 1, () => {
    console.log(`🏥 Health check endpoint running on port ${PORT + 1}`);
});

console.log(`🚀 TW2GEM Server running on port ${PORT}`);
console.log(`📞 Twilio webhook URL: ws://localhost:${PORT}`);
console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);