import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
const twilioAccountSid = process.env.VITE_TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.VITE_TWILIO_AUTH_TOKEN;

console.log('🔍 COMPREHENSIVE MARKET READINESS TEST\n');
console.log('='.repeat(60));

// Test 1: Environment Variables
console.log('1️⃣  ENVIRONMENT VARIABLES');
console.log('-'.repeat(30));

const envTests = [
    { name: 'Supabase URL', value: supabaseUrl, critical: true },
    { name: 'Supabase Service Key', value: supabaseKey, critical: true },
    { name: 'Gemini API Key', value: geminiApiKey, critical: true },
    { name: 'Twilio Account SID', value: twilioAccountSid, critical: true },
    { name: 'Twilio Auth Token', value: twilioAuthToken, critical: true },
];

let criticalEnvIssues = 0;
envTests.forEach(test => {
    if (test.value) {
        console.log(`✅ ${test.name}: Configured`);
    } else {
        console.log(`❌ ${test.name}: Missing`);
        if (test.critical) criticalEnvIssues++;
    }
});

if (criticalEnvIssues > 0) {
    console.log(`\n⚠️  ${criticalEnvIssues} critical environment variables missing!`);
}

// Test 2: API Connectivity
console.log('\n2️⃣  API CONNECTIVITY');
console.log('-'.repeat(30));

// Test Supabase
if (supabaseUrl && supabaseKey) {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ Supabase: ${error.message}`);
        } else {
            console.log('✅ Supabase: Connected');
        }
    } catch (error) {
        console.log(`❌ Supabase: ${error.message}`);
    }
} else {
    console.log('❌ Supabase: Missing credentials');
}

// Test Gemini API
if (geminiApiKey) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        if (response.ok) {
            console.log('✅ Gemini API: Connected');
        } else {
            console.log(`❌ Gemini API: HTTP ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Gemini API: ${error.message}`);
    }
} else {
    console.log('❌ Gemini API: Missing key');
}

// Test Twilio API
if (twilioAccountSid && twilioAuthToken) {
    try {
        const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}.json`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        if (response.ok) {
            console.log('✅ Twilio API: Connected');
        } else {
            console.log(`❌ Twilio API: HTTP ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Twilio API: ${error.message}`);
    }
} else {
    console.log('❌ Twilio API: Missing credentials');
}

// Test 3: Server Health
console.log('\n3️⃣  SERVER HEALTH');
console.log('-'.repeat(30));

try {
    const healthResponse = await fetch('http://localhost:12002/health');
    if (healthResponse.ok) {
        const health = await healthResponse.json();
        console.log('✅ TW2GEM Server: Running');
        console.log(`   Status: ${health.status}`);
        console.log(`   Gemini: ${health.gemini ? 'Connected' : 'Not Connected'}`);
    } else {
        console.log('❌ TW2GEM Server: Not responding');
    }
} catch (error) {
    console.log('❌ TW2GEM Server: Not running');
}

try {
    const dashboardResponse = await fetch('http://localhost:12000');
    if (dashboardResponse.ok) {
        console.log('✅ Dashboard: Running');
    } else {
        console.log('❌ Dashboard: Not responding');
    }
} catch (error) {
    console.log('❌ Dashboard: Not running');
}

// Test 4: Critical File Checks
console.log('\n4️⃣  CRITICAL FILES');
console.log('-'.repeat(30));

import { existsSync } from 'fs';

const criticalFiles = [
    './dashboard/.env.local',
    './.env',
    './packages/tw2gem-server/dist/index.js',
    './packages/twilio-server/dist/index.js',
    './packages/gemini-live-client/dist/index.js',
    './dashboard/tw2gem-server.js'
];

criticalFiles.forEach(file => {
    if (existsSync(file)) {
        console.log(`✅ ${file}: Exists`);
    } else {
        console.log(`❌ ${file}: Missing`);
    }
});

// Test 5: Package Dependencies
console.log('\n5️⃣  PACKAGE DEPENDENCIES');
console.log('-'.repeat(30));

import { execSync } from 'child_process';

try {
    const npmList = execSync('npm list --depth=0 --json', { encoding: 'utf8' });
    const packages = JSON.parse(npmList);
    
    const criticalDeps = [
        '@supabase/supabase-js',
        'dotenv',
        'concurrently'
    ];
    
    criticalDeps.forEach(dep => {
        if (packages.dependencies && packages.dependencies[dep]) {
            console.log(`✅ ${dep}: Installed`);
        } else {
            console.log(`❌ ${dep}: Missing`);
        }
    });
    
} catch (error) {
    console.log('⚠️  Could not check package dependencies');
}

// Summary
console.log('\n📊 MARKET READINESS SUMMARY');
console.log('='.repeat(60));

if (criticalEnvIssues === 0) {
    console.log('✅ Environment: Ready');
} else {
    console.log('❌ Environment: Issues found');
}

console.log('\n🚨 CRITICAL ACTIONS NEEDED:');
console.log('1. Apply database schema fixes (run fix-schema.sql in Supabase)');
console.log('2. Verify all API keys are valid and have proper permissions');
console.log('3. Test end-to-end call functionality');
console.log('4. Set up proper RLS policies for production');
console.log('5. Configure webhook endpoints for Twilio');

console.log('\n🔧 NEXT STEPS:');
console.log('1. Run: node test-schema.js (after applying schema fixes)');
console.log('2. Test making an actual call through the system');
console.log('3. Verify data persistence and retrieval');
console.log('4. Check error handling and logging');

process.exit(0);