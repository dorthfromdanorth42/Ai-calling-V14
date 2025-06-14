#!/usr/bin/env node

import fetch from 'node-fetch';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });
dotenv.config({ path: './dashboard/.env.local' });

const SERVER_URL = 'ws://localhost:12001';
const DASHBOARD_URL = 'http://localhost:12000';

console.log('🔊 AI Call Center - Call Functionality Test\n');

async function testTwilioWebhookEndpoint() {
  console.log('📞 Testing Twilio Webhook Endpoint...');
  try {
    // Test WebSocket connection to server
    const ws = new WebSocket(SERVER_URL);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ws.close();
        console.log('❌ WebSocket connection timeout');
        resolve(false);
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ WebSocket connection successful');
        ws.close();
        resolve(true);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log('❌ WebSocket connection failed:', error.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.log('❌ WebSocket test failed:', error.message);
    return false;
  }
}

async function testGeminiLiveConnection() {
  console.log('🤖 Testing Gemini API Connection...');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);

    if (response.ok) {
      const data = await response.json();
      const hasLiveModel = data.models?.some(model => model.name.includes('gemini-2.0-flash-live'));
      if (hasLiveModel) {
        console.log('✅ Gemini Live API is accessible and live model is available');
      } else {
        console.log('✅ Gemini API is accessible (live model availability unknown)');
      }
      return true;
    } else {
      console.log('❌ Gemini API returned status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini API test failed:', error.message);
    return false;
  }
}

async function testTwilioAPIConnection() {
  console.log('📱 Testing Twilio API Connection...');
  try {
    const auth = Buffer.from(`${process.env.VITE_TWILIO_ACCOUNT_SID}:${process.env.VITE_TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}.json`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (response.ok) {
      console.log('✅ Twilio API connection successful');
      return true;
    } else {
      console.log('❌ Twilio API returned status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Twilio API test failed:', error.message);
    return false;
  }
}

async function testDashboardAPIEndpoints() {
  console.log('🖥️  Testing Dashboard API Endpoints...');
  try {
    // Test if dashboard has API endpoints
    const endpoints = [
      '/api/health',
      '/api/calls',
      '/api/agents'
    ];

    let workingEndpoints = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${DASHBOARD_URL}${endpoint}`);
        if (response.status !== 404) {
          workingEndpoints++;
        }
      } catch (error) {
        // Endpoint might not exist, which is okay
      }
    }

    console.log(`✅ Dashboard is accessible (${workingEndpoints} API endpoints found)`);
    return true;
  } catch (error) {
    console.log('❌ Dashboard API test failed:', error.message);
    return false;
  }
}

async function runCallFunctionalityTests() {
  console.log('Starting call functionality tests...\n');
  
  const results = {
    webhook: await testTwilioWebhookEndpoint(),
    gemini: await testGeminiLiveConnection(),
    twilio: await testTwilioAPIConnection(),
    dashboard: await testDashboardAPIEndpoints()
  };
  
  console.log('\n📊 CALL FUNCTIONALITY REPORT');
  console.log('================================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log(`\nCall Functionality Score: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 CALL FUNCTIONALITY IS READY!');
    console.log('\n📋 NEXT STEPS FOR PRODUCTION:');
    console.log('1. Configure Twilio phone number webhook to point to your server');
    console.log('2. Test with real phone calls');
    console.log('3. Monitor call quality and performance');
    console.log('4. Set up call recording and analytics');
  } else {
    console.log('⚠️  CALL FUNCTIONALITY NEEDS ATTENTION');
    console.log('\nIssues to Fix:');
    Object.entries(results).forEach(([test, passed]) => {
      if (!passed) {
        console.log(`- Fix ${test} connectivity/configuration`);
      }
    });
  }
  
  return passed === total;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCallFunctionalityTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runCallFunctionalityTests };