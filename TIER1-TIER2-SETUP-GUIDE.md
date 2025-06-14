# AI Calling V10 - Tier 1 & Tier 2 Features Setup Guide

## 🚀 Complete Infrastructure Implementation

This guide covers the setup and configuration of all Tier 1 (CRITICAL) and Tier 2 (HIGH PRIORITY) features for the AI Calling V10 platform.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Tier 1 Features](#tier-1-features)
4. [Tier 2 Features](#tier-2-features)
5. [Environment Configuration](#environment-configuration)
6. [Testing & Validation](#testing--validation)
7. [Deployment](#deployment)

## Prerequisites

### Required Services
- ✅ Supabase Database (PostgreSQL)
- ✅ Stripe Account (for payments)
- ✅ Google Cloud Platform (for Gemini API)
- ✅ Twilio Account (for calling)
- ✅ VAPID Keys (for push notifications)

### Environment Variables
```bash
# Core Services
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_TWILIO_ACCOUNT_SID=your_twilio_sid
VITE_TWILIO_AUTH_TOKEN=your_twilio_token

# Stripe Integration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Security & Privacy
VITE_ENCRYPTION_KEY=your_encryption_key_32_chars
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Webhooks
WEBHOOK_SECRET_KEY=your_webhook_secret_key
```

## Database Setup

### 1. Apply Schema
Execute the comprehensive schema file in your Supabase SQL editor:

```sql
-- Run the complete schema from TIER1-TIER2-SCHEMA.sql
-- This includes all tables, indexes, RLS policies, and initial data
```

### 2. Verify Tables Created
Check that all tables are created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'function_call_logs', 'appointments', 'subscription_plans', 
  'user_subscriptions', 'notifications', 'dnc_lists', 
  'tcpa_consents', 'compliance_violations', 'webhook_endpoints',
  'analytics_metrics', 'predictive_insights'
);
```

### 3. Enable Realtime
Ensure realtime is enabled for key tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_violations;
ALTER PUBLICATION supabase_realtime ADD TABLE function_call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
```

## Tier 1 Features (CRITICAL)

### 🤖 Enhanced Gemini Function Calling Integration

#### Setup Steps:
1. **Update Gemini Client Configuration**
   ```typescript
   // In your Gemini setup
   const geminiConfig = {
     model: 'gemini-2.0-flash-live-001',
     generationConfig: {
       responseModalities: ['AUDIO'],
       speechConfig: {
         voiceConfig: {
           prebuiltVoiceConfig: { voiceName: 'Kore' }
         },
         languageCode: 'en-US'
       }
     },
     tools: functionHandler.getFunctionDefinitions(), // Auto-populated
     realtimeInputConfig: {
       automaticActivityDetection: {
         disabled: false,
         startOfSpeechSensitivity: 'START_SENSITIVITY_MEDIUM',
         endOfSpeechSensitivity: 'END_SENSITIVITY_MEDIUM'
       }
     }
   }
   ```

2. **Register Custom Functions**
   ```typescript
   // Add business-specific functions
   functionHandler.registerFunction({
     name: 'book_consultation',
     description: 'Book a consultation appointment',
     parameters: {
       type: 'object',
       properties: {
         customer_name: { type: 'string' },
         preferred_date: { type: 'string' },
         service_type: { type: 'string' }
       },
       required: ['customer_name', 'preferred_date']
     },
     handler: async (args, context) => {
       // Your custom booking logic
       return { success: true, appointment_id: 'apt_123' }
     }
   })
   ```

3. **Test Function Calling**
   ```bash
   # Test with a sample call
   curl -X POST http://localhost:3000/api/test-function-call \
     -H "Content-Type: application/json" \
     -d '{"function_name": "schedule_appointment", "args": {"customer_name": "Test User"}}'
   ```

### 🔧 Function Call Handler Implementation

#### Features Included:
- ✅ 7 Pre-built business functions
- ✅ Automatic function registration
- ✅ Error handling and retry logic
- ✅ Performance monitoring
- ✅ Security validation

#### Available Functions:
1. `schedule_appointment` - Book customer appointments
2. `update_lead_status` - Update CRM lead status
3. `send_followup_email` - Send automated emails
4. `add_to_dnc` - Add numbers to Do Not Call list
5. `get_customer_info` - Retrieve customer data
6. `calculate_pricing` - Dynamic pricing calculation
7. `check_availability` - Check appointment availability

## Tier 2 Features (HIGH PRIORITY)

### 💳 Stripe Payment Integration

#### Setup Steps:
1. **Configure Stripe Webhooks**
   ```bash
   # Add webhook endpoint in Stripe Dashboard
   # URL: https://your-domain.com/api/stripe/webhook
   # Events: customer.subscription.created, customer.subscription.updated, invoice.payment_succeeded
   ```

2. **Test Payment Flow**
   ```typescript
   // Test subscription creation
   const stripeService = new StripeService(STRIPE_PUBLISHABLE_KEY)
   const session = await stripeService.createCheckoutSession('price_standard_monthly')
   ```

3. **Verify Usage Tracking**
   ```sql
   -- Check usage records are being created
   SELECT * FROM usage_records WHERE profile_id = 'your_user_id' ORDER BY created_at DESC LIMIT 10;
   ```

### 📦 Fiverr Gig Package System

#### Features:
- ✅ 3 Pre-configured packages (Basic, Standard, Premium)
- ✅ Dynamic pricing calculation
- ✅ Order management system
- ✅ Requirements collection
- ✅ Delivery milestone tracking

#### Test Package System:
```typescript
// Create a test order
const order = FiverrPackageService.createOrder({
  package_id: 'basic-ai-agent',
  extras: ['extra-contacts'],
  client_info: {
    name: 'Test Client',
    email: 'test@example.com'
  },
  project_details: { industry: 'Real Estate' }
})
```

### 🔔 Real-Time Notifications System

#### Setup Steps:
1. **Generate VAPID Keys**
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Create Service Worker**
   ```javascript
   // public/sw.js
   self.addEventListener('push', function(event) {
     const options = {
       body: event.data.text(),
       icon: '/icon-192x192.png',
       badge: '/badge-72x72.png'
     }
     event.waitUntil(
       self.registration.showNotification('AI Calling', options)
     )
   })
   ```

3. **Initialize Push Notifications**
   ```typescript
   // In your app
   await NotificationService.initializePushNotifications(userId)
   ```

### 🛡️ Enhanced Compliance System

#### Features:
- ✅ DNC List Management
- ✅ TCPA Consent Tracking
- ✅ Calling Hours Validation
- ✅ Frequency Limit Enforcement
- ✅ Compliance Reporting

#### Setup Default Rules:
```typescript
// Automatically creates default compliance rules
await ComplianceService.createDefaultRules(profileId)
```

#### Test Compliance Check:
```typescript
const validation = await ComplianceService.validateCallCompliance(
  profileId, 
  '+1234567890', 
  'America/New_York'
)
console.log('Compliant:', validation.compliant)
console.log('Violations:', validation.violations)
```

### 🔐 Data Privacy & Security

#### Features:
- ✅ PII Encryption/Decryption
- ✅ Data Retention Policies
- ✅ GDPR/CCPA Compliance
- ✅ Data Subject Requests
- ✅ Security Audit Logging

#### Setup Default Policies:
```typescript
await PrivacySecurityService.createDefaultRetentionPolicies(profileId)
```

#### Test Data Export:
```typescript
const exportData = await PrivacySecurityService.generateDataExport(profileId)
```

### 📊 Business Intelligence Analytics

#### Features:
- ✅ Real-time Analytics
- ✅ Predictive Insights
- ✅ KPI Tracking
- ✅ Custom Reports
- ✅ Benchmarking

#### Generate Sample Insights:
```typescript
const insights = await BusinessIntelligenceService.generatePredictiveInsights(profileId)
const dashboard = await BusinessIntelligenceService.getExecutiveDashboard(profileId)
```

### 🔗 Enhanced Webhook System

#### Features:
- ✅ Retry Logic with Exponential Backoff
- ✅ Signature Verification
- ✅ Event Filtering
- ✅ Delivery Monitoring
- ✅ Bulk Operations

#### Create Webhook Endpoint:
```typescript
const endpoint = await EnhancedWebhookService.createWebhookEndpoint({
  profile_id: profileId,
  name: 'My CRM Integration',
  url: 'https://my-crm.com/webhooks/ai-calling',
  events: ['call.completed', 'appointment.scheduled'],
  active: true,
  retry_config: {
    max_retries: 3,
    retry_delay_ms: 1000,
    backoff_multiplier: 2,
    max_delay_ms: 30000
  }
})
```

## Environment Configuration

### 1. Update Environment Files

#### `.env.local` (Frontend)
```bash
# Core
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Security
VITE_ENCRYPTION_KEY=your_32_character_encryption_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key

# Features
VITE_ENABLE_FUNCTION_CALLING=true
VITE_ENABLE_COMPLIANCE=true
VITE_ENABLE_ANALYTICS=true
```

#### `.env` (Server)
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Security
VAPID_PRIVATE_KEY=your_vapid_private_key
WEBHOOK_SECRET_KEY=your_webhook_secret

# Database
DATABASE_URL=your_supabase_connection_string
```

### 2. Update Configuration Files

#### `vite.config.ts`
```typescript
export default defineConfig({
  // ... existing config
  define: {
    'process.env.VITE_ENABLE_FUNCTION_CALLING': JSON.stringify(process.env.VITE_ENABLE_FUNCTION_CALLING),
    'process.env.VITE_ENABLE_COMPLIANCE': JSON.stringify(process.env.VITE_ENABLE_COMPLIANCE),
  }
})
```

## Testing & Validation

### 1. Function Call Testing
```bash
# Test function registration
npm run test:functions

# Test Gemini integration
npm run test:gemini

# Test webhook delivery
npm run test:webhooks
```

### 2. Compliance Testing
```bash
# Test DNC list functionality
npm run test:compliance:dnc

# Test TCPA consent
npm run test:compliance:tcpa

# Test calling hours
npm run test:compliance:hours
```

### 3. Payment Testing
```bash
# Test Stripe integration
npm run test:stripe

# Test subscription flow
npm run test:subscriptions
```

### 4. Analytics Testing
```bash
# Generate test data
npm run test:analytics:generate

# Test insights generation
npm run test:analytics:insights
```

## Deployment

### 1. Pre-deployment Checklist
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] Stripe webhooks configured
- [ ] VAPID keys generated
- [ ] Service worker deployed
- [ ] All tests passing

### 2. Deploy Steps
```bash
# Build the application
npm run build

# Deploy to your hosting platform
npm run deploy

# Verify deployment
npm run verify:deployment
```

### 3. Post-deployment Verification
```bash
# Test critical paths
curl -X POST https://your-domain.com/api/health
curl -X POST https://your-domain.com/api/stripe/webhook-test
curl -X POST https://your-domain.com/api/compliance/validate
```

## 🎯 Feature Status Summary

### Tier 1 Features (CRITICAL) ✅
- [x] **Enhanced Gemini Function Calling Integration** - Complete with 7 business functions
- [x] **Function Call Handler Implementation** - Full error handling and monitoring

### Tier 2 Features (HIGH PRIORITY) ✅
- [x] **Stripe Payment Integration** - Complete subscription management
- [x] **Fiverr Gig Package System** - 3 packages with dynamic pricing
- [x] **Real-Time Notifications** - Push notifications with preferences
- [x] **Enhanced Compliance** - DNC, TCPA, calling hours validation
- [x] **Data Privacy & Security** - GDPR/CCPA compliance tools
- [x] **Business Intelligence Analytics** - Predictive insights and KPIs
- [x] **Enhanced Webhook System** - Retry logic and security

## 🔧 Advanced Configuration

### Custom Function Registration
```typescript
// Register industry-specific functions
functionHandler.registerFunction({
  name: 'real_estate_valuation',
  description: 'Get property valuation estimate',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string' },
      property_type: { type: 'string' }
    }
  },
  handler: async (args, context) => {
    // Integration with real estate APIs
    return { estimated_value: 450000, confidence: 0.85 }
  }
})
```

### Custom Compliance Rules
```typescript
// Add industry-specific compliance rules
await ComplianceService.createRule({
  profile_id: profileId,
  rule_type: 'industry_specific',
  name: 'Healthcare HIPAA Compliance',
  description: 'Ensure HIPAA compliance for healthcare calls',
  parameters: {
    require_consent: true,
    max_retention_days: 365,
    encryption_required: true
  }
})
```

### Custom Analytics Metrics
```typescript
// Track custom business metrics
await BusinessIntelligenceService.trackMetric({
  profile_id: profileId,
  metric_name: 'lead_quality_score',
  value: 8.5,
  period: 'daily',
  dimensions: { source: 'facebook_ads', campaign: 'q1_2024' }
})
```

## 🚨 Troubleshooting

### Common Issues

1. **Function Calls Not Working**
   - Check Gemini API key
   - Verify function registration
   - Check network connectivity

2. **Stripe Webhooks Failing**
   - Verify webhook secret
   - Check endpoint URL
   - Review webhook logs

3. **Notifications Not Sending**
   - Check VAPID keys
   - Verify service worker
   - Check browser permissions

4. **Compliance Violations**
   - Review DNC list
   - Check TCPA consents
   - Verify calling hours

### Debug Commands
```bash
# Check function call logs
npm run debug:functions

# Check webhook deliveries
npm run debug:webhooks

# Check compliance status
npm run debug:compliance

# Check analytics data
npm run debug:analytics
```

## 📞 Support

For technical support or questions about implementation:

1. Check the troubleshooting section above
2. Review the API documentation
3. Check the GitHub issues
4. Contact the development team

---

**🎉 Congratulations!** You now have a fully implemented AI Calling V10 platform with all Tier 1 and Tier 2 features. The system includes advanced function calling, payment processing, compliance management, analytics, and much more.

**Next Steps:**
1. Customize functions for your specific business needs
2. Configure compliance rules for your industry
3. Set up custom analytics dashboards
4. Train your AI agents with your specific scripts
5. Launch your campaigns and monitor performance

The platform is now ready for production use with enterprise-grade features and scalability.