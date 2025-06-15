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

async function frontendUITesting() {
  console.log('🎨 FRONTEND UI TESTING - COMPREHENSIVE VALIDATION');
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
    // 1. FRONTEND FILE STRUCTURE ANALYSIS
    console.log('\n📁 FRONTEND FILE STRUCTURE ANALYSIS');
    console.log('-'.repeat(60));

    const dashboardPath = './dashboard';
    
    // Check if dashboard directory exists
    const dashboardExists = fs.existsSync(dashboardPath);
    test('Structure', 'Dashboard directory exists', dashboardExists, true);
    
    if (dashboardExists) {
      // Check essential files
      const essentialFiles = [
        'package.json',
        'vite.config.js',
        'index.html',
        '.env.local'
      ];
      
      for (const file of essentialFiles) {
        const filePath = path.join(dashboardPath, file);
        const fileExists = fs.existsSync(filePath);
        test('Structure', `${file} exists`, fileExists, true);
      }
      
      // Check essential directories
      const essentialDirs = [
        'src',
        'src/components',
        'src/pages',
        'src/lib',
        'node_modules'
      ];
      
      for (const dir of essentialDirs) {
        const dirPath = path.join(dashboardPath, dir);
        const dirExists = fs.existsSync(dirPath);
        test('Structure', `${dir} directory exists`, dirExists, 
             ['src', 'src/components', 'src/pages'].includes(dir));
      }
      
      // Analyze package.json
      try {
        const packageJsonPath = path.join(dashboardPath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        test('Structure', 'package.json is valid JSON', true, true);
        test('Structure', 'Has dependencies', !!packageJson.dependencies, true, 
             `${Object.keys(packageJson.dependencies || {}).length} dependencies`);
        test('Structure', 'Has dev dependencies', !!packageJson.devDependencies, false,
             `${Object.keys(packageJson.devDependencies || {}).length} dev dependencies`);
        test('Structure', 'Has scripts', !!packageJson.scripts, true,
             `${Object.keys(packageJson.scripts || {}).length} scripts`);
        
        // Check for essential dependencies
        const essentialDeps = [
          '@supabase/supabase-js',
          'react',
          'vite'
        ];
        
        for (const dep of essentialDeps) {
          const hasDepency = packageJson.dependencies && packageJson.dependencies[dep];
          test('Dependencies', `${dep} dependency`, !!hasDepency, true);
        }
        
      } catch (err) {
        test('Structure', 'package.json is valid JSON', false, true, err.message);
      }
      
      // Check source code structure
      const srcPath = path.join(dashboardPath, 'src');
      if (fs.existsSync(srcPath)) {
        const srcFiles = fs.readdirSync(srcPath, { withFileTypes: true });
        const hasMainFile = srcFiles.some(file => 
          file.isFile() && (file.name === 'main.jsx' || file.name === 'main.tsx' || file.name === 'App.jsx')
        );
        test('Structure', 'Has main application file', hasMainFile, true);
        
        // Check components directory
        const componentsPath = path.join(srcPath, 'components');
        if (fs.existsSync(componentsPath)) {
          const componentFiles = fs.readdirSync(componentsPath);
          test('Structure', 'Has UI components', componentFiles.length > 0, true,
               `${componentFiles.length} component files`);
        }
        
        // Check pages directory
        const pagesPath = path.join(srcPath, 'pages');
        if (fs.existsSync(pagesPath)) {
          const pageFiles = fs.readdirSync(pagesPath);
          test('Structure', 'Has page components', pageFiles.length > 0, true,
               `${pageFiles.length} page files`);
        }
      }
    }

    // 2. FRONTEND BUILD SYSTEM TESTING
    console.log('\n🔨 FRONTEND BUILD SYSTEM TESTING');
    console.log('-'.repeat(60));

    if (dashboardExists) {
      // Check Vite configuration
      const viteConfigPath = path.join(dashboardPath, 'vite.config.js');
      const viteConfigExists = fs.existsSync(viteConfigPath);
      test('Build', 'Vite config exists', viteConfigExists, true);
      
      if (viteConfigExists) {
        try {
          const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
          test('Build', 'Vite config readable', true, true);
          
          // Check for essential Vite configurations
          const hasHostConfig = viteConfig.includes('host') || viteConfig.includes('0.0.0.0');
          const hasPortConfig = viteConfig.includes('port');
          
          test('Build', 'Has host configuration', hasHostConfig, false);
          test('Build', 'Has port configuration', hasPortConfig, false);
          
        } catch (err) {
          test('Build', 'Vite config readable', false, true, err.message);
        }
      }
      
      // Check if node_modules exists (dependencies installed)
      const nodeModulesPath = path.join(dashboardPath, 'node_modules');
      const nodeModulesExists = fs.existsSync(nodeModulesPath);
      test('Build', 'Dependencies installed', nodeModulesExists, true);
      
      if (nodeModulesExists) {
        // Check for key dependencies in node_modules
        const keyDeps = ['react', '@supabase', 'vite'];
        for (const dep of keyDeps) {
          const depPath = path.join(nodeModulesPath, dep);
          const depExists = fs.existsSync(depPath);
          test('Build', `${dep} installed`, depExists, dep === 'react' || dep === '@supabase');
        }
      }
    }

    // 3. ENVIRONMENT CONFIGURATION TESTING
    console.log('\n⚙️ ENVIRONMENT CONFIGURATION TESTING');
    console.log('-'.repeat(60));

    const envPath = path.join(dashboardPath, '.env.local');
    const envExists = fs.existsSync(envPath);
    test('Config', '.env.local exists', envExists, true);
    
    if (envExists) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        test('Config', 'Environment file readable', true, true);
        test('Config', 'Has environment variables', envLines.length > 0, true,
             `${envLines.length} variables`);
        
        // Check for required environment variables
        const requiredEnvVars = [
          'VITE_SUPABASE_URL',
          'VITE_SUPABASE_ANON_KEY',
          'VITE_SUPABASE_SERVICE_KEY',
          'VITE_GEMINI_API_KEY',
          'VITE_TWILIO_ACCOUNT_SID',
          'VITE_TWILIO_AUTH_TOKEN'
        ];
        
        for (const envVar of requiredEnvVars) {
          const hasVar = envContent.includes(envVar);
          const hasValue = envContent.includes(`${envVar}=`) && 
                          !envContent.includes(`${envVar}=\n`) &&
                          !envContent.includes(`${envVar}=""\n`);
          test('Config', `${envVar} configured`, hasVar && hasValue, true);
        }
        
      } catch (err) {
        test('Config', 'Environment file readable', false, true, err.message);
      }
    }

    // 4. FRONTEND SERVER TESTING
    console.log('\n🌐 FRONTEND SERVER TESTING');
    console.log('-'.repeat(60));

    // Test if we can reach the development server
    const serverUrls = [
      'https://work-1-qkghxfntlfmbhuuv.prod-runtime.all-hands.dev',
      'https://work-2-qkghxfntlfmbhuuv.prod-runtime.all-hands.dev',
      'https://work-3-qkghxfntlfmbhuuv.prod-runtime.all-hands.dev'
    ];
    
    let serverReachable = false;
    let reachableUrl = null;
    
    for (const url of serverUrls) {
      try {
        const response = await fetch(url, { 
          timeout: 5000,
          headers: { 'User-Agent': 'Testing-Bot' }
        });
        if (response.ok || response.status === 404) { // 404 is ok, means server is running
          serverReachable = true;
          reachableUrl = url;
          break;
        }
      } catch (err) {
        // Continue to next URL
      }
    }
    
    test('Server', 'Frontend server reachable', serverReachable, false, reachableUrl || 'No server found');
    
    if (serverReachable && reachableUrl) {
      try {
        // Test if it's actually serving the React app
        const response = await fetch(reachableUrl, { timeout: 10000 });
        const content = await response.text();
        
        const isReactApp = content.includes('react') || 
                          content.includes('vite') || 
                          content.includes('<!DOCTYPE html>');
        
        test('Server', 'Serving React application', isReactApp, true);
        
        // Check for essential HTML elements
        const hasTitle = content.includes('<title>');
        const hasBody = content.includes('<body>');
        const hasRoot = content.includes('id="root"') || content.includes('id="app"');
        
        test('Server', 'Valid HTML structure', hasTitle && hasBody, true);
        test('Server', 'React root element', hasRoot, true);
        
      } catch (err) {
        test('Server', 'Frontend content validation', false, false, err.message);
      }
    }

    // 5. COMPONENT ARCHITECTURE TESTING
    console.log('\n🧩 COMPONENT ARCHITECTURE TESTING');
    console.log('-'.repeat(60));

    const srcPath = path.join(dashboardPath, 'src');
    if (fs.existsSync(srcPath)) {
      // Analyze component structure
      const componentsPath = path.join(srcPath, 'components');
      if (fs.existsSync(componentsPath)) {
        const componentFiles = fs.readdirSync(componentsPath, { recursive: true })
          .filter(file => file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js'));
        
        test('Components', 'Has component files', componentFiles.length > 0, true,
             `${componentFiles.length} component files`);
        
        // Check for common UI components
        const commonComponents = ['Button', 'Modal', 'Form', 'Table', 'Card', 'Layout'];
        let foundComponents = 0;
        
        for (const component of commonComponents) {
          const hasComponent = componentFiles.some(file => 
            file.toLowerCase().includes(component.toLowerCase())
          );
          if (hasComponent) foundComponents++;
        }
        
        test('Components', 'Has common UI components', foundComponents >= 3, false,
             `${foundComponents}/${commonComponents.length} common components found`);
      }
      
      // Check pages structure
      const pagesPath = path.join(srcPath, 'pages');
      if (fs.existsSync(pagesPath)) {
        const pageFiles = fs.readdirSync(pagesPath, { recursive: true })
          .filter(file => file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js'));
        
        test('Components', 'Has page components', pageFiles.length > 0, true,
             `${pageFiles.length} page files`);
        
        // Check for essential pages
        const essentialPages = ['dashboard', 'login', 'agents', 'campaigns', 'leads'];
        let foundPages = 0;
        
        for (const page of essentialPages) {
          const hasPage = pageFiles.some(file => 
            file.toLowerCase().includes(page.toLowerCase())
          );
          if (hasPage) foundPages++;
        }
        
        test('Components', 'Has essential pages', foundPages >= 3, true,
             `${foundPages}/${essentialPages.length} essential pages found`);
      }
      
      // Check for routing
      const routingFiles = fs.readdirSync(srcPath, { recursive: true })
        .filter(file => 
          file.toLowerCase().includes('router') || 
          file.toLowerCase().includes('route') ||
          file.toLowerCase().includes('app.jsx') ||
          file.toLowerCase().includes('app.tsx')
        );
      
      test('Components', 'Has routing configuration', routingFiles.length > 0, true,
           `${routingFiles.length} routing files`);
    }

    // 6. STYLING AND ASSETS TESTING
    console.log('\n🎨 STYLING AND ASSETS TESTING');
    console.log('-'.repeat(60));

    if (fs.existsSync(srcPath)) {
      // Check for CSS/styling files
      const styleFiles = fs.readdirSync(srcPath, { recursive: true })
        .filter(file => 
          file.endsWith('.css') || 
          file.endsWith('.scss') || 
          file.endsWith('.sass') ||
          file.endsWith('.module.css')
        );
      
      test('Styling', 'Has styling files', styleFiles.length > 0, false,
           `${styleFiles.length} style files`);
      
      // Check for assets directory
      const assetsPath = path.join(srcPath, 'assets');
      const publicPath = path.join(dashboardPath, 'public');
      
      const hasAssets = fs.existsSync(assetsPath) || fs.existsSync(publicPath);
      test('Styling', 'Has assets directory', hasAssets, false);
      
      if (fs.existsSync(assetsPath)) {
        const assetFiles = fs.readdirSync(assetsPath, { recursive: true });
        test('Styling', 'Has asset files', assetFiles.length > 0, false,
             `${assetFiles.length} asset files`);
      }
      
      if (fs.existsSync(publicPath)) {
        const publicFiles = fs.readdirSync(publicPath);
        test('Styling', 'Has public files', publicFiles.length > 0, false,
             `${publicFiles.length} public files`);
      }
    }

    // 7. INTEGRATION TESTING
    console.log('\n🔗 FRONTEND INTEGRATION TESTING');
    console.log('-'.repeat(60));

    // Check for Supabase integration in code
    if (fs.existsSync(srcPath)) {
      const allFiles = fs.readdirSync(srcPath, { recursive: true })
        .filter(file => file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx'));
      
      let hasSupabaseImport = false;
      let hasApiCalls = false;
      let hasAuthLogic = false;
      
      for (const file of allFiles) {
        try {
          const filePath = path.join(srcPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (content.includes('@supabase/supabase-js') || content.includes('createClient')) {
            hasSupabaseImport = true;
          }
          
          if (content.includes('.from(') || content.includes('.select(') || content.includes('.insert(')) {
            hasApiCalls = true;
          }
          
          if (content.includes('auth') || content.includes('login') || content.includes('session')) {
            hasAuthLogic = true;
          }
        } catch (err) {
          // Skip files that can't be read
        }
      }
      
      test('Integration', 'Has Supabase integration', hasSupabaseImport, true);
      test('Integration', 'Has database API calls', hasApiCalls, true);
      test('Integration', 'Has authentication logic', hasAuthLogic, true);
    }

    // 8. RESPONSIVE DESIGN TESTING
    console.log('\n📱 RESPONSIVE DESIGN TESTING');
    console.log('-'.repeat(60));

    if (fs.existsSync(srcPath)) {
      const allFiles = fs.readdirSync(srcPath, { recursive: true })
        .filter(file => file.endsWith('.css') || file.endsWith('.jsx') || file.endsWith('.tsx'));
      
      let hasResponsiveCSS = false;
      let hasMobileClasses = false;
      
      for (const file of allFiles) {
        try {
          const filePath = path.join(srcPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (content.includes('@media') || content.includes('responsive') || content.includes('breakpoint')) {
            hasResponsiveCSS = true;
          }
          
          if (content.includes('mobile') || content.includes('tablet') || content.includes('desktop') ||
              content.includes('sm:') || content.includes('md:') || content.includes('lg:')) {
            hasMobileClasses = true;
          }
        } catch (err) {
          // Skip files that can't be read
        }
      }
      
      test('Responsive', 'Has responsive CSS', hasResponsiveCSS, false);
      test('Responsive', 'Has mobile-friendly classes', hasMobileClasses, false);
    }

  } catch (error) {
    console.error('\n❌ Critical error during frontend testing:', error);
    criticalFailures.push('System: Critical error during frontend testing');
  }

  // FRONTEND TESTING RESULTS
  console.log('\n' + '='.repeat(80));
  console.log('📊 FRONTEND UI TESTING RESULTS');
  console.log('='.repeat(80));

  // Category breakdown
  for (const [category, tests] of Object.entries(testResults)) {
    const categoryPassed = tests.filter(t => t.status === 'PASS').length;
    const categoryTotal = tests.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
    
    console.log(`\n${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    
    const criticalTests = tests.filter(t => t.critical);
    const criticalPassed = criticalTests.filter(t => t.status === 'PASS').length;
    const criticalTotal = criticalTests.length;
    
    if (criticalTotal > 0) {
      console.log(`   Critical: ${criticalPassed}/${criticalTotal} (${((criticalPassed/criticalTotal)*100).toFixed(1)}%)`);
    }
    
    // Show failed tests
    const failedTests = tests.filter(t => t.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log(`   Failed Tests:`);
      failedTests.forEach(test => {
        const criticalMark = test.critical ? '🚨' : '⚠️';
        console.log(`     ${criticalMark} ${test.name}${test.details ? ' - ' + test.details : ''}`);
      });
    }
  }

  const successRate = (passedTests / totalTests) * 100;
  const criticalSuccessRate = criticalFailures.length === 0 ? 100 : 
    ((totalTests - criticalFailures.length) / totalTests) * 100;

  console.log(`\n📊 FRONTEND TESTING SUMMARY:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`🔥 Critical Success Rate: ${criticalSuccessRate.toFixed(1)}%`);

  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES:');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  }

  // FRONTEND TESTING VERDICT
  console.log('\n' + '='.repeat(80));
  console.log('🎯 FRONTEND UI TESTING VERDICT');
  console.log('='.repeat(80));

  const isFrontendReady = successRate >= 80 && criticalFailures.length <= 2;
  const isFrontendExcellent = successRate >= 95 && criticalFailures.length === 0;
  
  if (isFrontendExcellent) {
    console.log('🎉 FRONTEND: EXCELLENT ✅');
    console.log('✅ Frontend exceeds quality standards');
    console.log('✅ All critical components validated');
    console.log('✅ Ready for production deployment');
  } else if (isFrontendReady) {
    console.log('✅ FRONTEND: READY ✅');
    console.log('✅ Frontend meets deployment standards');
    console.log('✅ Core functionality implemented');
    console.log('⚠️  Minor improvements can be made post-launch');
  } else {
    console.log('⚠️  FRONTEND: NEEDS IMPROVEMENT 🟡');
    console.log(`🔧 ${criticalFailures.length} critical issue(s) in frontend`);
    console.log('📋 Address frontend issues before deployment');
  }

  return {
    totalTests,
    passedTests,
    successRate,
    criticalFailures,
    warnings,
    frontendReady: isFrontendReady,
    frontendExcellent: isFrontendExcellent
  };
}

frontendUITesting().catch(console.error);