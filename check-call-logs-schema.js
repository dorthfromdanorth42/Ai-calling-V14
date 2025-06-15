#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function checkCallLogsSchema() {
  console.log('🔍 CHECKING CALL LOGS TABLE SCHEMA');
  console.log('='.repeat(50));

  try {
    // Try to get any existing call logs to see the structure
    const { data: callLogs, error: callLogsError } = await supabase
      .from('call_logs')
      .select('*')
      .limit(5);
    
    if (callLogsError) {
      console.log(`❌ Error accessing call_logs: ${callLogsError.message}`);
      return;
    }

    if (callLogs && callLogs.length > 0) {
      console.log('✅ Found existing call logs');
      console.log('📋 Available columns:');
      const columns = Object.keys(callLogs[0]);
      columns.forEach(col => console.log(`   - ${col}`));
      
      console.log('\n📊 Sample data:');
      console.log(JSON.stringify(callLogs[0], null, 2));
    } else {
      console.log('⚠️  No existing call logs found');
      
      // Try to insert with minimal data to see what's required
      console.log('\n🧪 Testing minimal call log insertion...');
      
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      const profileId = profiles[0]?.id;
      
      if (profileId) {
        const minimalCallLog = {
          profile_id: profileId
        };

        const { data: result, error: insertError } = await supabase
          .from('call_logs')
          .insert(minimalCallLog)
          .select()
          .single();
        
        if (insertError) {
          console.log(`❌ Minimal insert failed: ${insertError.message}`);
          console.log(`   Details: ${insertError.details || 'No details'}`);
          console.log(`   Hint: ${insertError.hint || 'No hint'}`);
        } else {
          console.log(`✅ Minimal insert succeeded: ${result.id}`);
          console.log('📋 Created record structure:');
          console.log(JSON.stringify(result, null, 2));
          
          // Clean up
          await supabase.from('call_logs').delete().eq('id', result.id);
        }
      }
    }

    // Now test the complete workflow with correct call log structure
    console.log('\n🔄 TESTING COMPLETE WORKFLOW WITH CORRECT SCHEMA...');
    
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;
    
    if (profileId) {
      // Create agent
      const agent = {
        profile_id: profileId,
        name: 'Schema Test Agent ' + Date.now(),
        description: 'Testing with correct schema',
        is_active: true
      };

      const { data: agentResult, error: agentError } = await supabase
        .from('ai_agents')
        .insert(agent)
        .select()
        .single();
      
      if (!agentError) {
        console.log(`✅ Agent created: ${agentResult.id}`);
        
        // Create campaign
        const campaign = {
          profile_id: profileId,
          agent_id: agentResult.id,
          name: 'Schema Test Campaign ' + Date.now(),
          status: 'draft',
          caller_id: '+1234567890'
        };

        const { data: campaignResult, error: campaignError } = await supabase
          .from('outbound_campaigns')
          .insert(campaign)
          .select()
          .single();
        
        if (!campaignError) {
          console.log(`✅ Campaign created: ${campaignResult.id}`);
          
          // Create lead
          const lead = {
            campaign_id: campaignResult.id,
            profile_id: profileId,
            phone_number: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
            first_name: 'SchemaTest',
            last_name: 'Lead',
            status: 'pending'
          };

          const { data: leadResult, error: leadError } = await supabase
            .from('campaign_leads')
            .insert(lead)
            .select()
            .single();
          
          if (!leadError) {
            console.log(`✅ Lead created: ${leadResult.id}`);
            
            // Create call log with minimal required fields
            let callLogData;
            
            if (callLogs && callLogs.length > 0) {
              // Use existing structure
              const sample = callLogs[0];
              callLogData = {
                ...Object.fromEntries(
                  Object.entries(sample)
                    .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
                    .map(([key, value]) => {
                      if (key === 'profile_id') return [key, profileId];
                      if (key === 'campaign_id') return [key, campaignResult.id];
                      if (key === 'lead_phone') return [key, leadResult.phone_number];
                      if (typeof value === 'string') return [key, 'Test value'];
                      if (typeof value === 'number') return [key, 120];
                      if (typeof value === 'boolean') return [key, true];
                      return [key, value];
                    })
                )
              };
            } else {
              // Try with just profile_id
              callLogData = {
                profile_id: profileId
              };
            }

            const { data: callLogResult, error: callLogError } = await supabase
              .from('call_logs')
              .insert(callLogData)
              .select()
              .single();
            
            if (!callLogError) {
              console.log(`✅ Call log created: ${callLogResult.id}`);
              
              // Create appointment
              const appointment = {
                profile_id: profileId,
                scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                customer_name: 'SchemaTest Lead',
                customer_phone: leadResult.phone_number,
                status: 'scheduled',
                appointment_type: 'consultation'
              };

              const { data: appointmentResult, error: appointmentError } = await supabase
                .from('appointments')
                .insert(appointment)
                .select()
                .single();
              
              if (!appointmentError) {
                console.log(`✅ Appointment created: ${appointmentResult.id}`);
                console.log('\n🎉 COMPLETE WORKFLOW SUCCESS!');
                
                // Clean up
                await supabase.from('appointments').delete().eq('id', appointmentResult.id);
              } else {
                console.log(`❌ Appointment failed: ${appointmentError.message}`);
              }
              
              await supabase.from('call_logs').delete().eq('id', callLogResult.id);
            } else {
              console.log(`❌ Call log failed: ${callLogError.message}`);
            }
            
            await supabase.from('campaign_leads').delete().eq('id', leadResult.id);
          } else {
            console.log(`❌ Lead failed: ${leadError.message}`);
          }
          
          await supabase.from('outbound_campaigns').delete().eq('id', campaignResult.id);
        } else {
          console.log(`❌ Campaign failed: ${campaignError.message}`);
        }
        
        await supabase.from('ai_agents').delete().eq('id', agentResult.id);
      } else {
        console.log(`❌ Agent failed: ${agentError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking call logs schema:', error);
  }
}

checkCallLogsSchema().catch(console.error);