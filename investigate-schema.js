#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function investigateSchema() {
  console.log('🔍 INVESTIGATING SCHEMA ISSUES');
  console.log('='.repeat(50));

  try {
    // Get profile ID
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;

    // 1. INVESTIGATE LEADS ISSUE
    console.log('\n👤 INVESTIGATING LEADS SCHEMA...');
    
    // The error shows it's trying to insert into "campaign_leads" table, not "leads"
    // This suggests there might be a trigger or the table name is different
    
    // Let's check if there are existing leads to see the correct format
    const { data: existingLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(3);
    
    if (existingLeads && existingLeads.length > 0) {
      console.log('✅ Found existing leads. Sample structure:');
      console.log('   Columns:', Object.keys(existingLeads[0]).join(', '));
      console.log('   Status values:', existingLeads.map(l => l.status).join(', '));
      
      // Try to create a lead with the same structure as existing ones
      const sampleLead = existingLeads[0];
      const testLead = {
        ...Object.fromEntries(
          Object.entries(sampleLead)
            .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
            .map(([key, value]) => {
              if (key === 'phone_number') return [key, '+1987654321'];
              if (key === 'first_name') return [key, 'TestFirst'];
              if (key === 'last_name') return [key, 'TestLast'];
              if (key === 'email') return [key, 'test@example.com'];
              return [key, value];
            })
        )
      };
      
      console.log('🧪 Testing lead with existing structure...');
      const { data: leadResult, error: leadErr } = await supabase
        .from('leads')
        .insert(testLead)
        .select()
        .single();
      
      if (leadErr) {
        console.log(`❌ Still failed: ${leadErr.message}`);
      } else {
        console.log(`✅ Lead created successfully: ${leadResult.id}`);
        // Clean up
        await supabase.from('leads').delete().eq('id', leadResult.id);
      }
    } else {
      console.log('⚠️  No existing leads found. Checking table structure...');
      
      // Try different status values that might be valid
      const possibleStatuses = [
        'new', 'contacted', 'qualified', 'not_qualified', 'callback', 
        'voicemail', 'busy', 'no_answer', 'wrong_number', 'do_not_call'
      ];
      
      for (const status of possibleStatuses) {
        const testLead = {
          phone_number: '+1987654321',
          first_name: 'Test',
          last_name: 'Lead',
          status: status,
          campaign_id: null // Try with null campaign_id
        };

        const { data: leadResult, error: leadErr } = await supabase
          .from('leads')
          .insert(testLead)
          .select()
          .single();
        
        if (!leadErr) {
          console.log(`✅ Lead created with status '${status}': ${leadResult.id}`);
          // Clean up
          await supabase.from('leads').delete().eq('id', leadResult.id);
          break;
        } else {
          console.log(`❌ Status '${status}': ${leadErr.message}`);
        }
      }
    }

    // 2. INVESTIGATE APPOINTMENTS ISSUE
    console.log('\n📅 INVESTIGATING APPOINTMENTS SCHEMA...');
    
    // The error shows appointment_type is required
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .limit(3);
    
    if (existingAppointments && existingAppointments.length > 0) {
      console.log('✅ Found existing appointments. Sample structure:');
      console.log('   Columns:', Object.keys(existingAppointments[0]).join(', '));
      console.log('   Types:', existingAppointments.map(a => a.appointment_type || 'null').join(', '));
      
      // Try to create appointment with existing structure
      const sampleAppointment = existingAppointments[0];
      const testAppointment = {
        ...Object.fromEntries(
          Object.entries(sampleAppointment)
            .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
            .map(([key, value]) => {
              if (key === 'appointment_date') return [key, new Date().toISOString()];
              if (key === 'customer_name') return [key, 'Test Customer'];
              if (key === 'customer_phone') return [key, '+1987654321'];
              return [key, value];
            })
        )
      };
      
      console.log('🧪 Testing appointment with existing structure...');
      const { data: appointmentResult, error: appointmentErr } = await supabase
        .from('appointments')
        .insert(testAppointment)
        .select()
        .single();
      
      if (appointmentErr) {
        console.log(`❌ Still failed: ${appointmentErr.message}`);
      } else {
        console.log(`✅ Appointment created successfully: ${appointmentResult.id}`);
        // Clean up
        await supabase.from('appointments').delete().eq('id', appointmentResult.id);
      }
    } else {
      console.log('⚠️  No existing appointments found. Testing with appointment_type...');
      
      // Try different appointment types
      const possibleTypes = [
        'consultation', 'demo', 'follow_up', 'sales_call', 'support', 'meeting'
      ];
      
      for (const type of possibleTypes) {
        const testAppointment = {
          profile_id: profileId,
          appointment_date: new Date().toISOString(),
          customer_name: 'Test Customer',
          customer_phone: '+1987654321',
          status: 'scheduled',
          appointment_type: type
        };

        const { data: appointmentResult, error: appointmentErr } = await supabase
          .from('appointments')
          .insert(testAppointment)
          .select()
          .single();
        
        if (!appointmentErr) {
          console.log(`✅ Appointment created with type '${type}': ${appointmentResult.id}`);
          // Clean up
          await supabase.from('appointments').delete().eq('id', appointmentResult.id);
          break;
        } else {
          console.log(`❌ Type '${type}': ${appointmentErr.message}`);
        }
      }
    }

    console.log('\n✅ Schema investigation complete');

  } catch (error) {
    console.error('❌ Error investigating schema:', error);
  }
}

investigateSchema().catch(console.error);