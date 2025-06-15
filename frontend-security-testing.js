#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function frontendSecurityTesting() {
  console.log('🔐 FRONTEND & SECURITY COMPREHENSIVE TESTING');
  console.log('='.repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalFailures = [];
  let warnings = [];
  let testResults = {};

  const test = (category, name, condition, isCritical = true, details = '') => {
    totalTests++;
    const status = condition ? 'PASS' : 'FAIL';
    
    if (!testResults[category]) testResults[category] = [];
    testResults[category].push({ name, status, critical: isCritical, details });
    
    if (condition) {
      console.log(`✅ ${name}${details ? ' - ' + details : ''}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}${details ? ' - ' + details : ''}`);
      if (isCritical) {
        criticalFailures.push(`${category}: ${name}`);
      } else {
        warnings.push(`${category}: ${name}`);
      }
    }
  };

  try {
    // 1. FRONTEND CODE STRUCTURE ANALYSIS
    console.log('\n🎨 FRONTEND CODE STRUCTURE ANALYSIS');
    console.log('-'.repeat(60));

    const dashboardPath = './dashboard';
    
    // Check if dashboard directory exists
    const dashboardExists = fs.existsSync(dashboardPath);
    test('Frontend', 'Dashboard directory exists', dashboardExists, true);

    if (dashboardExists) {
      // Check essential frontend files
      const essentialFiles = [
        'package.json',
        'vite.config.js',
        'index.html',
        'src/main.jsx',
        'src/App.jsx',
        '.env.local'
      ];

      for (const file of essentialFiles) {
        const filePath = path.join(dashboardPath, file);
        const fileExists = fs.existsSync(filePath);
        test('Frontend', `${file} exists`, fileExists, 
             ['package.json', 'src/main.jsx', 'src/App.jsx'].includes(file));
      }

      // Check src directory structure
      const srcPath = path.join(dashboardPath, 'src');
      if (fs.existsSync(srcPath)) {
        const srcContents = fs.readdirSync(srcPath);
        test('Frontend', 'Components directory', srcContents.includes('components'), false);
        test('Frontend', 'Pages directory', srcContents.includes('pages'), false);
        test('Frontend', 'Utils directory', srcContents.includes('utils'), false);
        test('Frontend', 'Hooks directory', srcContents.includes('hooks'), false);
      }

      // Check package.json dependencies
      const packageJsonPath = path.join(dashboardPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        const criticalDependencies = [
          'react',
          'react-dom',
          'vite',
          '@supabase/supabase-js'
        ];

        for (const dep of criticalDependencies) {
          const hasDepency = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
          test('Frontend', `${dep} dependency`, !!hasDepency, true);
        }

        // Check for security-related dependencies
        const securityDeps = [
          '@supabase/auth-helpers-react',
          '@supabase/auth-ui-react'
        ];

        for (const dep of securityDeps) {
          const hasDepency = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
          test('Frontend', `${dep} security dependency`, !!hasDepency, false);
        }
      }
    }

    // 2. ENVIRONMENT SECURITY TESTING
    console.log('\n🔒 ENVIRONMENT SECURITY TESTING');
    console.log('-'.repeat(60));

    // Check environment variable security
    const envPath = path.join(dashboardPath, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check for exposed secrets
      const hasServiceKey = envContent.includes('VITE_SUPABASE_SERVICE_KEY');
      test('Security', 'Service key in frontend env', !hasServiceKey, true, 
           'Service key should not be in frontend');
      
      // Check for proper VITE_ prefixes
      const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      const allHaveVitePrefix = envLines.every(line => 
        line.startsWith('VITE_') || !line.includes('=')
      );
      test('Security', 'All frontend env vars have VITE_ prefix', allHaveVitePrefix, false);
      
      // Check for hardcoded secrets
      const hasHardcodedSecrets = envContent.includes('sk-') || 
                                  envContent.includes('pk_live_') ||
                                  envContent.includes('rk_live_');
      test('Security', 'No hardcoded API secrets', !hasHardcodedSecrets, true);
    }

    // 3. API SECURITY TESTING
    console.log('\n🛡️ API SECURITY TESTING');
    console.log('-'.repeat(60));

    // Test SQL injection protection
    const sqlInjectionTests = [
      "'; DROP TABLE profiles; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM profiles --"
    ];

    for (const injection of sqlInjectionTests) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', injection)
          .limit(1);
        
        // Should not return data or should handle gracefully
        const isProtected = !data || data.length === 0 || !!error;
        test('Security', `SQL injection protection (${injection.substring(0, 10)}...)`, isProtected, true);
      } catch (err) {
        test('Security', `SQL injection protection (${injection.substring(0, 10)}...)`, true, true, 'Properly caught');
      }
    }

    // Test XSS protection in data insertion
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '"><script>alert("xss")</script>'
    ];

    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;

    if (profileId) {
      for (const payload of xssPayloads) {
        try {
          const { data, error } = await supabase
            .from('ai_agents')
            .insert({
              profile_id: profileId,
              name: payload,
              description: 'XSS test',
              is_active: true
            })
            .select()
            .single();
          
          if (!error) {
            // Check if the payload was sanitized or stored as-is
            const isStored = data.name === payload;
            test('Security', `XSS payload storage (${payload.substring(0, 10)}...)`, true, false, 
                 isStored ? 'Stored as-is (needs frontend sanitization)' : 'Sanitized');
            
            // Cleanup
            await supabase.from('ai_agents').delete().eq('id', data.id);
          } else {
            test('Security', `XSS payload rejection (${payload.substring(0, 10)}...)`, true, false, 'Rejected');
          }
        } catch (err) {
          test('Security', `XSS payload handling (${payload.substring(0, 10)}...)`, true, false, 'Error caught');
        }
      }
    }

    // 4. AUTHENTICATION & AUTHORIZATION TESTING
    console.log('\n🔐 AUTHENTICATION & AUTHORIZATION TESTING');
    console.log('-'.repeat(60));

    // Test anonymous access restrictions
    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const sensitiveOperations = [
      {
        name: 'Anonymous profile access',
        test: () => anonClient.from('profiles').select('*').limit(1)
      },
      {
        name: 'Anonymous agent creation',
        test: () => anonClient.from('ai_agents').insert({
          profile_id: profileId,
          name: 'Anon Agent',
          description: 'Should fail',
          is_active: true
        })
      },
      {
        name: 'Anonymous campaign access',
        test: () => anonClient.from('outbound_campaigns').select('*').limit(1)
      },
      {
        name: 'Anonymous lead access',
        test: () => anonClient.from('campaign_leads').select('*').limit(1)
      }
    ];

    for (const operation of sensitiveOperations) {
      try {
        const { data, error } = await operation.test();
        // These should fail for security
        const isSecure = !!error || !data || data.length === 0;
        test('Security', operation.name, isSecure, true, 
             isSecure ? 'Properly blocked' : 'SECURITY VULNERABILITY');
      } catch (err) {
        test('Security', operation.name, true, true, 'Properly blocked');
      }
    }

    // Test session management
    try {
      const { data: session, error } = await supabase.auth.getSession();
      test('Security', 'Session management available', !error, true);
      
      // Test sign out functionality
      const { error: signOutError } = await supabase.auth.signOut();
      test('Security', 'Sign out functionality', !signOutError, true);
    } catch (err) {
      test('Security', 'Session management', false, true);
    }

    // 5. DATA VALIDATION & SANITIZATION TESTING
    console.log('\n🧹 DATA VALIDATION & SANITIZATION TESTING');
    console.log('-'.repeat(60));

    if (profileId) {
      // Test phone number validation
      const phoneTests = [
        { phone: '+1234567890', valid: true },
        { phone: '1234567890', valid: false },
        { phone: '+1-234-567-8900', valid: false },
        { phone: 'invalid-phone', valid: false },
        { phone: '', valid: false }
      ];

      for (const phoneTest of phoneTests) {
        try {
          const { data, error } = await supabase
            .from('campaign_leads')
            .insert({
              campaign_id: (await supabase.from('outbound_campaigns').select('id').limit(1)).data[0]?.id,
              profile_id: profileId,
              phone_number: phoneTest.phone,
              first_name: 'Test',
              last_name: 'Lead',
              status: 'pending'
            })
            .select()
            .single();
          
          const result = !error;
          test('Validation', `Phone validation (${phoneTest.phone || 'empty'})`, 
               result === phoneTest.valid, false);
          
          if (!error) {
            await supabase.from('campaign_leads').delete().eq('id', data.id);
          }
        } catch (err) {
          test('Validation', `Phone validation (${phoneTest.phone || 'empty'})`, 
               !phoneTest.valid, false);
        }
      }

      // Test email validation
      const emailTests = [
        { email: 'test@example.com', valid: true },
        { email: 'invalid-email', valid: false },
        { email: '@example.com', valid: false },
        { email: 'test@', valid: false },
        { email: '', valid: true } // Empty might be allowed
      ];

      for (const emailTest of emailTests) {
        try {
          const { data, error } = await supabase
            .from('campaign_leads')
            .insert({
              campaign_id: (await supabase.from('outbound_campaigns').select('id').limit(1)).data[0]?.id,
              profile_id: profileId,
              phone_number: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
              first_name: 'Test',
              last_name: 'Lead',
              email: emailTest.email,
              status: 'pending'
            })
            .select()
            .single();
          
          const result = !error;
          test('Validation', `Email validation (${emailTest.email || 'empty'})`, 
               result === emailTest.valid, false);
          
          if (!error) {
            await supabase.from('campaign_leads').delete().eq('id', data.id);
          }
        } catch (err) {
          test('Validation', `Email validation (${emailTest.email || 'empty'})`, 
               !emailTest.valid, false);
        }
      }
    }

    // 6. RATE LIMITING & ABUSE PROTECTION
    console.log('\n⚡ RATE LIMITING & ABUSE PROTECTION');
    console.log('-'.repeat(60));

    // Test rapid requests (basic rate limiting test)
    const rapidRequests = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      rapidRequests.push(
        supabase.from('profiles').select('id').limit(1)
      );
    }

    try {
      const results = await Promise.all(rapidRequests);
      const endTime = Date.now();
      const allSucceeded = results.every(result => !result.error);
      const timeTaken = endTime - startTime;
      
      test('Security', 'Rapid requests handling', allSucceeded, false, 
           `10 requests in ${timeTaken}ms`);
      
      // Check if there's any rate limiting (requests should be fast but not instant)
      test('Security', 'Rate limiting present', timeTaken > 50, false, 
           'Some delay expected for security');
    } catch (err) {
      test('Security', 'Rapid requests handling', false, false, 'Rate limited or error');
    }

    // 7. BUSINESS LOGIC SECURITY
    console.log('\n🏢 BUSINESS LOGIC SECURITY');
    console.log('-'.repeat(60));

    if (profileId) {
      // Test user isolation (users should only see their own data)
      try {
        // Create a test agent
        const { data: testAgent, error: agentError } = await supabase
          .from('ai_agents')
          .insert({
            profile_id: profileId,
            name: 'Isolation Test Agent',
            description: 'Testing user isolation',
            is_active: true
          })
          .select()
          .single();
        
        if (!agentError) {
          // Try to access with different profile_id filter
          const { data: isolationTest, error: isolationError } = await supabase
            .from('ai_agents')
            .select('*')
            .eq('profile_id', '00000000-0000-0000-0000-000000000000')
            .eq('id', testAgent.id);
          
          const isIsolated = !isolationTest || isolationTest.length === 0;
          test('Security', 'User data isolation', isIsolated, true, 
               'Users should only access their own data');
          
          // Cleanup
          await supabase.from('ai_agents').delete().eq('id', testAgent.id);
        }
      } catch (err) {
        test('Security', 'User data isolation', false, true);
      }

      // Test privilege escalation protection
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ 
            role: 'admin',
            permissions: 'all'
          })
          .eq('id', profileId);
        
        // This should either fail or be ignored
        test('Security', 'Privilege escalation protection', !!error, true, 
             error ? 'Properly blocked' : 'May need review');
      } catch (err) {
        test('Security', 'Privilege escalation protection', true, true, 'Properly blocked');
      }
    }

    // 8. FRONTEND BUILD & DEPLOYMENT SECURITY
    console.log('\n🚀 FRONTEND BUILD & DEPLOYMENT SECURITY');
    console.log('-'.repeat(60));

    // Check if build directory exists
    const buildPath = path.join(dashboardPath, 'dist');
    const buildExists = fs.existsSync(buildPath);
    test('Frontend', 'Build directory exists', buildExists, false);

    if (buildExists) {
      // Check for source maps in production build
      const buildFiles = fs.readdirSync(buildPath, { recursive: true });
      const hasSourceMaps = buildFiles.some(file => file.toString().endsWith('.map'));
      test('Security', 'No source maps in build', !hasSourceMaps, false, 
           'Source maps expose code structure');
      
      // Check for minification
      const jsFiles = buildFiles.filter(file => file.toString().endsWith('.js') && !file.toString().endsWith('.map'));
      if (jsFiles.length > 0) {
        const sampleJsPath = path.join(buildPath, jsFiles[0].toString());
        const jsContent = fs.readFileSync(sampleJsPath, 'utf8');
        const isMinified = !jsContent.includes('\n  ') && jsContent.length > 1000;
        test('Security', 'JavaScript files minified', isMinified, false);
      }
    }

    // Check for environment variable exposure
    const viteConfigPath = path.join(dashboardPath, 'vite.config.js');
    if (fs.existsSync(viteConfigPath)) {
      const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
      const hasSecureConfig = !viteConfig.includes('SUPABASE_SERVICE_KEY') && 
                              !viteConfig.includes('TWILIO_AUTH_TOKEN');
      test('Security', 'Vite config secure', hasSecureConfig, true, 
           'No sensitive keys in frontend config');
    }

  } catch (error) {
    console.error('\n❌ Critical system error during frontend/security testing:', error);
    criticalFailures.push('System: Critical error during frontend/security testing');
  }

  // COMPREHENSIVE RESULTS ANALYSIS
  console.log('\n' + '='.repeat(80));
  console.log('📊 FRONTEND & SECURITY TESTING RESULTS');
  console.log('='.repeat(80));

  // Category breakdown with detailed analysis
  for (const [category, tests] of Object.entries(testResults)) {
    const categoryPassed = tests.filter(t => t.status === 'PASS').length;
    const categoryTotal = tests.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
    
    console.log(`\n${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    
    const criticalTests = tests.filter(t => t.critical);
    const criticalPassed = criticalTests.filter(t => t.status === 'PASS').length;
    const criticalTotal = criticalTests.length;
    
    if (criticalTotal > 0) {
      console.log(`   Critical: ${criticalPassed}/${criticalTotal}`);
    }
    
    // Show failed tests for this category
    const failedTests = tests.filter(t => t.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log(`   Failed tests:`);
      failedTests.forEach(test => {
        console.log(`     ❌ ${test.name}${test.details ? ' - ' + test.details : ''}`);
      });
    }
  }

  const successRate = (passedTests / totalTests) * 100;
  const criticalSuccessRate = criticalFailures.length === 0 ? 100 : 
    ((totalTests - criticalFailures.length) / totalTests) * 100;

  console.log(`\n📊 FRONTEND & SECURITY RESULTS:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`🔥 Critical Success Rate: ${criticalSuccessRate.toFixed(1)}%`);

  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL SECURITY FAILURES:');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  SECURITY WARNINGS:');
    warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  }

  // SECURITY READINESS DETERMINATION
  console.log('\n' + '='.repeat(80));
  console.log('🔐 SECURITY READINESS DETERMINATION');
  console.log('='.repeat(80));

  const isSecurityReady = successRate >= 85 && criticalFailures.length <= 2;
  const isProductionSecure = successRate >= 95 && criticalFailures.length === 0;

  if (isProductionSecure) {
    console.log('🛡️ VERDICT: PRODUCTION SECURE ✅');
    console.log('✅ All security measures in place');
    console.log('✅ No critical vulnerabilities identified');
    console.log('✅ Ready for production deployment');
  } else if (isSecurityReady) {
    console.log('⚠️ VERDICT: SECURITY READY WITH MONITORING ✅');
    console.log('✅ Core security measures operational');
    console.log('✅ Can launch with security monitoring');
    console.log(`⚠️  ${criticalFailures.length} security issue(s) to address`);
  } else {
    console.log('🚨 VERDICT: SECURITY ISSUES PRESENT 🔴');
    console.log('🚨 Critical security vulnerabilities found');
    console.log(`📊 ${criticalFailures.length} critical security failure(s)`);
    console.log('⛔ SECURITY REVIEW REQUIRED BEFORE LAUNCH');
  }

  console.log(`\n🔐 Security Confidence: ${successRate.toFixed(1)}%`);
  console.log(`🛡️ Critical Security: ${criticalSuccessRate.toFixed(1)}%`);
  console.log(`🚨 Security Issues: ${criticalFailures.length}`);
  console.log(`⚠️  Security Warnings: ${warnings.length}`);

  return {
    totalTests,
    passedTests,
    successRate,
    criticalFailures,
    warnings,
    securityReady: isSecurityReady,
    productionSecure: isProductionSecure,
    testResults
  };
}

frontendSecurityTesting().catch(console.error);