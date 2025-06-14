#!/usr/bin/env node

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });
dotenv.config({ path: './dashboard/.env.local' });

const DASHBOARD_URL = 'http://localhost:12000';
const SERVER_URL = 'http://localhost:12002';

// Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🚀 AI Call Center - Market Readiness Test\n');

async function testDashboardHealth() {
  console.log('📊 Testing Dashboard Health...');
  try {
    const response = await fetch(DASHBOARD_URL);
    if (response.ok) {
      console.log('✅ Dashboard is accessible');
      return true;
    } else {
      console.log('❌ Dashboard returned status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Dashboard connection failed:', error.message);
    return false;
  }
}

async function testServerHealth() {
  console.log('🔧 Testing Server Health...');
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (response.ok) {
      console.log('✅ Server is accessible');
      return true;
    } else {
      console.log('❌ Server returned status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server connection failed:', error.message);
    return false;
  }
}

async function testSupabaseConnection() {
  console.log('🗄️  Testing Supabase Connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('❌ Supabase error:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function testDatabaseSchema() {
  console.log('📋 Testing Database Schema...');
  const requiredTables = [
    'profiles',
    'call_logs', 
    'ai_agents',
    'appointments',
    'outbound_campaigns',
    'call_analytics'
  ];
  
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && error.code === 'PGRST116') {
        console.log(`❌ Table '${table}' does not exist`);
        allTablesExist = false;
      } else if (error) {
        console.log(`⚠️  Table '${table}' exists but has issues:`, error.message);
      } else {
        console.log(`✅ Table '${table}' exists and accessible`);
      }
    } catch (error) {
      console.log(`❌ Error checking table '${table}':`, error.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testEnvironmentVariables() {
  console.log('🔑 Testing Environment Variables...');
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'GEMINI_API_KEY',
    'VITE_TWILIO_ACCOUNT_SID',
    'VITE_TWILIO_AUTH_TOKEN'
  ];
  
  let allVarsPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`❌ ${varName} is missing`);
      allVarsPresent = false;
    }
  }
  
  return allVarsPresent;
}

async function testGeminiAPI() {
  console.log('🤖 Testing Gemini API...');
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
    if (response.ok) {
      console.log('✅ Gemini API key is valid');
      return true;
    } else {
      console.log('❌ Gemini API key is invalid or expired');
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini API test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting comprehensive market readiness tests...\n');
  
  const results = {
    dashboard: await testDashboardHealth(),
    server: await testServerHealth(),
    supabase: await testSupabaseConnection(),
    schema: await testDatabaseSchema(),
    environment: await testEnvironmentVariables(),
    gemini: await testGeminiAPI()
  };
  
  console.log('\n📊 MARKET READINESS REPORT');
  console.log('================================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log(`\nOverall Score: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 SYSTEM IS MARKET READY!');
  } else {
    console.log('⚠️  SYSTEM NEEDS ATTENTION BEFORE MARKET LAUNCH');
    console.log('\nCritical Issues to Fix:');
    Object.entries(results).forEach(([test, passed]) => {
      if (!passed) {
        console.log(`- Fix ${test} configuration/connectivity`);
      }
    });
  }
  
  return passed === total;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runAllTests };