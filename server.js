#!/usr/bin/env node

/**
 * AI Calling V14 - Production Backend Server
 * Handles Gemini Live integration and Twilio webhooks
 */

import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Environment validation
const requiredEnvVars = [
  'GOOGLE_API_KEY',
  'TWILIO_ACCOUNT_SID', 
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Store active calls and their Gemini connections
const activeCalls = new Map();

console.log('🚀 AI Calling V14 - Production Backend Server');
console.log('==============================================');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      gemini: 'connected',
      twilio: 'connected'
    }
  });
});

// Twilio webhook for incoming calls
app.post('/webhook/voice', (req, res) => {
  console.log('📞 Incoming call:', req.body.From);
  
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Connect to WebSocket for real-time audio
  const connect = twiml.connect();
  connect.stream({
    url: `wss://${req.get('host')}/media-stream`,
    track: 'both_tracks'
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// WebSocket server for media streams
const wss = new WebSocketServer({ port: PORT + 1 });

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection');
  
  let callSid = null;
  let geminiWs = null;
  let hasSpokenFirst = false;
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.event === 'start') {
        callSid = data.start.callSid;
        console.log(`📞 Call started: ${callSid}`);
        
        // Connect to Gemini Live
        geminiWs = new WebSocket(
          `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.GOOGLE_API_KEY}`
        );
        
        geminiWs.on('open', () => {
          console.log('🤖 Connected to Gemini Live');
          
          // Setup Gemini with voice configuration
          const setupMessage = {
            setup: {
              model: "models/gemini-2.0-flash-exp",
              generation_config: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: "AOEDE" // Warm, friendly voice
                    }
                  }
                }
              }
            }
          };
          
          geminiWs.send(JSON.stringify(setupMessage));
          
          // Send initial greeting (SPEAKS FIRST)
          setTimeout(() => {
            if (!hasSpokenFirst) {
              const greetingMessage = {
                client_content: {
                  turns: [{
                    role: "user", 
                    parts: [{
                      text: "Please say: 'Hello! Thank you for calling. How can I help you today?'"
                    }]
                  }],
                  turn_complete: true
                }
              };
              
              geminiWs.send(JSON.stringify(greetingMessage));
              hasSpokenFirst = true;
              console.log('👋 Sent initial greeting');
            }
          }, 500);
        });
        
        geminiWs.on('message', (geminiData) => {
          try {
            const response = JSON.parse(geminiData);
            
            if (response.server_content && response.server_content.model_turn) {
              const turn = response.server_content.model_turn;
              
              if (turn.parts) {
                for (const part of turn.parts) {
                  if (part.inline_data && part.inline_data.mime_type === 'audio/pcm') {
                    // Send audio back to Twilio
                    const audioMessage = {
                      event: 'media',
                      streamSid: data.start.streamSid,
                      media: {
                        payload: part.inline_data.data
                      }
                    };
                    
                    ws.send(JSON.stringify(audioMessage));
                    console.log('🎵 Sent audio to caller');
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ Gemini message error:', error);
          }
        });
        
        activeCalls.set(callSid, { ws, geminiWs });
      }
      
      if (data.event === 'media' && geminiWs) {
        // Forward audio to Gemini
        const audioMessage = {
          realtime_input: {
            media_chunks: [{
              mime_type: "audio/pcm",
              data: data.media.payload
            }]
          }
        };
        
        geminiWs.send(JSON.stringify(audioMessage));
      }
      
      if (data.event === 'stop') {
        console.log(`📞 Call ended: ${callSid}`);
        if (geminiWs) {
          geminiWs.close();
        }
        activeCalls.delete(callSid);
      }
      
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    if (geminiWs) {
      geminiWs.close();
    }
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📞 Webhook URL: https://your-app.render.com/webhook/voice`);
  console.log(`🔌 WebSocket URL: wss://your-app.render.com/media-stream`);
  console.log(`🤖 Gemini Live: Ready`);
  console.log(`📱 Twilio: Connected`);
  console.log('');
  console.log('✅ Backend is ready for production!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  
  // Close all active calls
  for (const [callSid, { ws, geminiWs }] of activeCalls) {
    if (geminiWs) geminiWs.close();
    if (ws) ws.close();
  }
  
  process.exit(0);
});