import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeMockData() {
    console.log('🧹 Removing all mock/demo data from database...\n');
    
    const cleanupOperations = [
        {
            name: 'Remove demo live calls',
            operation: () => supabase
                .from('live_calls')
                .delete()
                .in('customer_name', ['John Smith', 'Sarah Johnson'])
        },
        {
            name: 'Remove demo webhook events',
            operation: () => supabase
                .from('webhook_events')
                .delete()
                .like('call_id', 'demo-%')
        },
        {
            name: 'Remove demo campaign metrics',
            operation: () => supabase
                .from('campaign_metrics')
                .delete()
                .eq('profile_id', '00000000-0000-0000-0000-000000000000')
        },
        {
            name: 'Remove demo system metrics',
            operation: () => supabase
                .from('system_metrics')
                .delete()
                .eq('profile_id', '00000000-0000-0000-0000-000000000000')
        },
        {
            name: 'Remove test call logs with 555 numbers',
            operation: () => supabase
                .from('call_logs')
                .delete()
                .or('phone_number_from.like.+1-555-%,phone_number_to.like.+1-555-%')
        },
        {
            name: 'Remove test campaign leads with 555 numbers',
            operation: () => supabase
                .from('campaign_leads')
                .delete()
                .like('phone_number', '+1-555-%')
        },
        {
            name: 'Remove test DNC entries with 555 numbers',
            operation: () => supabase
                .from('dnc_lists')
                .delete()
                .like('phone_number', '+1-555-%')
        }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const cleanup of cleanupOperations) {
        console.log(`⏳ ${cleanup.name}...`);
        
        try {
            const { data, error } = await cleanup.operation();
            
            if (error) {
                if (error.message.includes('does not exist')) {
                    console.log(`   ℹ️  Table doesn't exist yet: ${cleanup.name}`);
                    successCount++;
                } else {
                    console.log(`   ❌ Failed: ${error.message}`);
                    errorCount++;
                }
            } else {
                const deletedCount = data ? data.length : 0;
                console.log(`   ✅ Cleaned up ${deletedCount} records`);
                successCount++;
            }
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
            errorCount++;
        }
    }
    
    console.log('\n📊 CLEANUP SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    
    if (errorCount === 0) {
        console.log('\n🎉 Database is now clean of all mock/demo data!');
        console.log('Ready for production use.');
    } else {
        console.log('\n⚠️  Some cleanup operations failed.');
        console.log('This might be due to missing tables (which is expected).');
    }
}

removeMockData().catch(console.error);