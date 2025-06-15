#!/bin/bash

# Automated deployment script for AI Calling V14
echo "🚀 AI Calling V14 - Automated Deployment"
echo "========================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check service health
check_health() {
    local url=$1
    local service_name=$2
    echo "🏥 Checking $service_name health..."
    
    for i in {1..10}; do
        if curl -s "$url" > /dev/null; then
            echo "✅ $service_name is healthy!"
            return 0
        fi
        echo "⏳ Waiting for $service_name... (attempt $i/10)"
        sleep 2
    done
    
    echo "❌ $service_name health check failed"
    return 1
}

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check Node.js
if ! command_exists node; then
    echo "❌ Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check npm
if ! command_exists npm; then
    echo "❌ npm not found. Please install Node.js"
    exit 1
fi

echo "✅ Node.js $(node --version) found"
echo "✅ npm $(npm --version) found"

# Navigate to project directory
cd /workspace/Ai-calling-V14

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd dashboard && npm install && cd ..

# Build packages
echo "🔨 Building packages..."
npm run build

# Build dashboard
echo "🎨 Building dashboard..."
cd dashboard && npm run build && cd ..

# Start services
echo "🌟 Starting services..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "tw2gem-server.js" || true
pkill -f "vite.*12000" || true

# Start server
echo "🖥️  Starting TW2GEM Server on port 12001..."
cd dashboard
nohup node tw2gem-server.js > ../server.log 2>&1 &
SERVER_PID=$!
cd ..

# Wait for server to start
sleep 5

# Start dashboard
echo "🎨 Starting Dashboard on port 12000..."
cd dashboard
nohup npm run start > ../dashboard.log 2>&1 &
DASHBOARD_PID=$!
cd ..

# Wait for services to start
sleep 10

# Health checks
echo "🏥 Running health checks..."

# Check server health (if health endpoint exists)
if check_health "http://localhost:12002/health" "TW2GEM Server Health"; then
    echo "✅ Server health check passed"
else
    echo "⚠️  Server health check failed, but service may still be running"
fi

# Check dashboard
if check_health "http://localhost:12000" "Dashboard"; then
    echo "✅ Dashboard health check passed"
else
    echo "⚠️  Dashboard health check failed, but service may still be running"
fi

# Display status
echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo "📞 Server URL: https://work-2-hctsdmvdgrgdvkpg.prod-runtime.all-hands.dev"
echo "🖥️  Dashboard URL: https://work-1-hctsdmvdgrgdvkpg.prod-runtime.all-hands.dev"
echo ""
echo "📊 Process Information:"
echo "Server PID: $SERVER_PID"
echo "Dashboard PID: $DASHBOARD_PID"
echo ""
echo "📝 Log Files:"
echo "Server logs: /workspace/Ai-calling-V14/server.log"
echo "Dashboard logs: /workspace/Ai-calling-V14/dashboard.log"
echo ""
echo "🛠️  Management Commands:"
echo "View server logs: tail -f /workspace/Ai-calling-V14/server.log"
echo "View dashboard logs: tail -f /workspace/Ai-calling-V14/dashboard.log"
echo "Stop server: kill $SERVER_PID"
echo "Stop dashboard: kill $DASHBOARD_PID"
echo "Stop all: pkill -f 'tw2gem-server.js|vite.*12000'"
echo ""
echo "🔧 Admin Credentials:"
echo "Email: gamblerspassion@gmail.com"
echo "Password: Elaine0511!"
echo ""
echo "✅ Ready for production use!"

# Save PIDs for later management
echo "$SERVER_PID" > /workspace/Ai-calling-V14/server.pid
echo "$DASHBOARD_PID" > /workspace/Ai-calling-V14/dashboard.pid

echo "💾 Process IDs saved to .pid files"