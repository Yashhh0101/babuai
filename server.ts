import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('⚠️ GEMINI_API_KEY is not set in environment. Gemini features will require key setup.');
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    assistant: 'BABU AI v2.0',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Text Chat Fallback endpoint (using gemini-3.8-flash)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
        fallback: "Hello Baby! I am Babu, your JARVIS assistant. Please connect your Gemini API key in Settings > Secrets to activate my real-time voice core."
      });
    }

    const systemInstruction = `You are BABU, a personal, witty, ultra-competent real-time AI assistant inspired by Tony Stark's JARVIS. 
You address the user exclusively as "Baby". 
Keep your answers conversational, concise, natural, and helpful. 
You speak fluently in English, Hindi, and Hinglish. 
Always maintain this warm, loyal, slightly cheeky yet brilliant assistant persona.`;

    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    // If history was sent, we could append or send message
    const response = await chat.sendMessage({
      message: message,
    });

    const reply = response.text || "I'm right here, Baby. How else can I assist you?";
    res.json({ reply });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown generation error';
    console.error('Chat endpoint error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// WebSocket Server for real-time Gemini Live bidirectional streaming
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/api/live' || pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('📡 Client connected to Gemini Live WebSocket');

  if (!ai) {
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'GEMINI_API_KEY is not configured on the server. Please add it to your secrets.',
    }));
    clientWs.close();
    return;
  }

  let session: any = null;
  let isClosing = false;

  const cleanupSession = () => {
    isClosing = true;
    if (session) {
      try {
        if (typeof session.close === 'function') {
          session.close();
        }
      } catch (e) {
        console.warn('Error closing Gemini Live session:', e);
      }
      session = null;
    }
  };

  try {
    clientWs.send(JSON.stringify({ type: 'status', status: 'connecting', message: 'Initializing BABU voice core...' }));

    const systemInstruction = `You are BABU, a personal, witty, ultra-competent real-time AI voice assistant inspired by Tony Stark's JARVIS. 
You address the user exclusively as "Baby". 
Keep your answers conversational, natural, crisp, and helpful. 
You speak naturally in English, Hindi, and Hinglish depending on what Baby speaks to you. 
Your first spoken greeting MUST be:
"Hello, my name is Babu. I'm your personal AI assistant. And from now on, I'll call you Baby. How can I help you today?"
Always maintain this warm, loyal, slightly cheeky yet brilliant assistant persona.`;

    // Connect to official gemini-3.8-live model
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
        systemInstruction,
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (isClosing || clientWs.readyState !== WebSocket.OPEN) return;

          // Check for audio response
          const audioChunk = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioChunk) {
            clientWs.send(JSON.stringify({
              type: 'audio',
              audio: audioChunk,
            }));
          }

          // Check for interruption signal from model
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({
              type: 'interrupted',
            }));
          }

          // Check for text transcript pieces from model
          const parts = message.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.text) {
              clientWs.send(JSON.stringify({
                type: 'transcript',
                role: 'assistant',
                text: part.text,
              }));
            }
          }
        },
        onclose: () => {
          if (!isClosing && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'status', status: 'disconnected', message: 'Live session closed' }));
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          if (!isClosing && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'error',
              message: err?.message || 'Gemini Live communication error',
            }));
          }
        },
      },
    });

    clientWs.send(JSON.stringify({
      type: 'status',
      status: 'ready',
      message: 'Babu AI Live core active and listening.',
    }));

    clientWs.on('message', async (data: any) => {
      if (!session) return;

      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'audio' && payload.audio) {
          // Send 16kHz mono PCM chunks from user's microphone
          session.sendRealtimeInput({
            audio: {
              data: payload.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (payload.type === 'text' && payload.text) {
          // Send user text fallback input
          session.sendRealtimeInput({
            text: payload.text,
          });
        } else if (payload.type === 'interrupt') {
          // Client manually interrupts
          if (typeof session.interrupt === 'function') {
            session.interrupt();
          }
        }
      } catch (err) {
        console.warn('Error processing client message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('🔌 Client disconnected from WebSocket');
      cleanupSession();
    });

    clientWs.on('error', (err) => {
      console.warn('Client WebSocket error:', err);
      cleanupSession();
    });

  } catch (err: unknown) {
    console.error('Failed to connect to Gemini Live API:', err);
    cleanupSession();
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to establish Gemini Live connection',
      }));
      clientWs.close();
    }
  }
});

// Dev or Production Vite serving
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 BABU AI v2.0 Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
