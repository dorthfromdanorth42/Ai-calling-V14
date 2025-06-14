#!/bin/bash

echo "🚀 AI Call Center - Production Deployment Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running in production environment
if [ "$NODE_ENV" != "production" ]; then
    print_warning "NODE_ENV is not set to 'production'. Setting it now..."
    export NODE_ENV=production
fi

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install
cd dashboard && npm install
cd ..
print_status "Dependencies installed"

# 2. Build packages
echo "🔨 Building packages..."
npm run build-packages
print_status "Packages built"

# 3. Environment check
echo "🔍 Checking environment variables..."
if [ -z "$GEMINI_API_KEY" ]; then
    print_error "GEMINI_API_KEY is not set"
    exit 1
fi

if [ -z "$VITE_SUPABASE_URL" ]; then
    print_error "VITE_SUPABASE_URL is not set"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    print_error "VITE_SUPABASE_ANON_KEY is not set"
    exit 1
fi

if [ -z "$VITE_TWILIO_ACCOUNT_SID" ]; then
    print_error "VITE_TWILIO_ACCOUNT_SID is not set"
    exit 1
fi

if [ -z "$VITE_TWILIO_AUTH_TOKEN" ]; then
    print_error "VITE_TWILIO_AUTH_TOKEN is not set"
    exit 1
fi

print_status "Environment variables validated"

# 4. Run market readiness test
echo "🧪 Running market readiness tests..."
if node test-market-readiness.js; then
    print_status "All tests passed - System is market ready!"
else
    print_error "Tests failed - System needs attention"
    exit 1
fi

# 5. Start production services
echo "🚀 Starting production services..."
echo "Dashboard will be available at: https://work-1-bjmktfvshcpaolpn.prod-runtime.all-hands.dev"
echo "Server will be available at: https://work-2-bjmktfvshcpaolpn.prod-runtime.all-hands.dev"
echo ""
echo "Press Ctrl+C to stop services"

# Start services with production settings
npm run start

echo "🎉 Production deployment complete!"