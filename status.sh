#!/bin/bash

# Status monitoring script for AI Calling V14
echo "📊 AI Calling V14 - System Status"
echo "================================="

# Function to check if process is running
check_process() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "✅ $service_name (PID: $pid) - RUNNING"
            return 0
        else
            echo "❌ $service_name (PID: $pid) - NOT RUNNING"
            return 1
        fi
    else
        echo "❓ $service_name - PID file not found"
        return 1
    fi
}

# Function to check service health
check_health() {
    local url=$1
    local service_name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo "✅ $service_name - HEALTHY"
        return 0
    else
        echo "❌ $service_name - UNHEALTHY"
        return 1
    fi
}

# Check processes
echo "🔍 Process Status:"
check_process "/workspace/Ai-calling-V14/server.pid" "TW2GEM Server"
check_process "/workspace/Ai-calling-V14/dashboard.pid" "Dashboard"

echo ""
echo "🏥 Health Checks:"
check_health "http://localhost:12002/health" "Server Health Endpoint"
check_health "http://localhost:12000" "Dashboard"

echo ""
echo "🌐 Public URLs:"
echo "📞 Server: https://work-2-hctsdmvdgrgdvkpg.prod-runtime.all-hands.dev"
echo "🖥️  Dashboard: https://work-1-hctsdmvdgrgdvkpg.prod-runtime.all-hands.dev"

echo ""
echo "🔧 Configuration Status:"
echo "Gemini API: $(curl -s http://localhost:12002/health 2>/dev/null | grep -o '"gemini":"[^"]*"' | cut -d'"' -f4 || echo 'Unknown')"
echo "Environment: ${NODE_ENV:-development}"

echo ""
echo "📝 Recent Logs:"
echo "--- Server Log (last 5 lines) ---"
tail -5 /workspace/Ai-calling-V14/server.log 2>/dev/null || echo "No server log found"

echo ""
echo "--- Dashboard Log (last 5 lines) ---"
tail -5 /workspace/Ai-calling-V14/dashboard.log 2>/dev/null || echo "No dashboard log found"

echo ""
echo "💾 Resource Usage:"
if command -v ps >/dev/null 2>&1; then
    echo "Memory usage:"
    ps aux | grep -E "(tw2gem-server|vite.*12000)" | grep -v grep | awk '{print $11 " - " $4 "% CPU, " $6 " KB memory"}'
fi

echo ""
echo "🕒 Last updated: $(date)"