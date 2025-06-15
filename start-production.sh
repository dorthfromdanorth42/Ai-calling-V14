#!/bin/bash

# Production startup script for AI Calling V14
echo "🚀 Starting AI Calling V14 Production Environment"

# Set environment variables
export NODE_ENV=production
export PORT=12001
export DASHBOARD_PORT=12000

# Build all packages
echo "📦 Building packages..."
cd /workspace/Ai-calling-V14

# Build packages in correct order
echo "Building audio-converter..."
cd packages/audio-converter && npm run build
cd ../..

echo "Building gemini-live-client..."
cd packages/gemini-live-client && npm run build
cd ../..

echo "Building twilio-server..."
cd packages/twilio-server && npm run build
cd ../..

echo "Building tw2gem-server..."
cd packages/tw2gem-server && npm run build
cd ../..

# Build dashboard
echo "Building dashboard..."
cd dashboard && npm run build
cd ..

echo "✅ All packages built successfully!"

# Start services
echo "🌟 Starting services..."

# Start the server on port 12001
echo "Starting TW2GEM Server on port 12001..."
cd dashboard
node tw2gem-server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Start the dashboard on port 12000
echo "Starting Dashboard on port 12000..."
npm run start &
DASHBOARD_PID=$!

echo "🎉 Services started successfully!"
echo "📞 Server running on: https://work-2-hctsdmvdgrgdvkpg.prod-runtime.all-hands.dev"
echo "🖥️  Dashboard running on: https://work-1-hctsdmvdgrgdvkpg.prod-runtime.all-hands.dev"
echo ""
echo "Server PID: $SERVER_PID"
echo "Dashboard PID: $DASHBOARD_PID"
echo ""
echo "To stop services:"
echo "kill $SERVER_PID $DASHBOARD_PID"

# Keep script running
wait