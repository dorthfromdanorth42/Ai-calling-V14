#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'https://work-1-qkghxfntlfmbhuuv.prod-runtime.all-hands.dev';

async function testLiveApplication() {
  console.log('🔍 TESTING LIVE APPLICATION');
  console.log('='.repeat(50));

  const pages = [
    { path: '/', name: 'Home' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/agents', name: 'AI Agents' },
    { path: '/calls', name: 'Call History' },
    { path: '/settings', name: 'Settings' }
  ];

  for (const page of pages) {
    try {
      console.log(`\n🔍 Testing ${page.name} (${page.path})`);
      
      const response = await fetch(`${BASE_URL}${page.path}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.ok) {
        const text = await response.text();
        const hasReactApp = text.includes('id="root"') || text.includes('React') || text.includes('Vite');
        const hasError = text.includes('Cannot GET') || text.includes('404') || text.includes('Error');
        
        console.log(`   ✅ Page loads successfully`);
        console.log(`   React App: ${hasReactApp ? '✅' : '❌'}`);
        console.log(`   Has Errors: ${hasError ? '❌' : '✅'}`);
        
        if (text.length < 1000) {
          console.log(`   ⚠️  Content seems minimal (${text.length} chars)`);
        }
      } else {
        console.log(`   ❌ Failed to load: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Test if the dashboard is actually running
  console.log('\n🔍 TESTING DASHBOARD SERVER');
  console.log('-'.repeat(30));
  
  try {
    const healthCheck = await fetch(`${BASE_URL}/health`, { timeout: 5000 });
    console.log(`Health Check: ${healthCheck.status}`);
  } catch (err) {
    console.log(`Health Check: Failed - ${err.message}`);
  }

  // Test static assets
  try {
    const assetsCheck = await fetch(`${BASE_URL}/assets/`, { timeout: 5000 });
    console.log(`Assets: ${assetsCheck.status}`);
  } catch (err) {
    console.log(`Assets: Failed - ${err.message}`);
  }
}

testLiveApplication().catch(console.error);