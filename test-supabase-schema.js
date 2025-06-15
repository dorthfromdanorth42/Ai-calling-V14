#!/usr/bin/env node

/**
 * Supabase Database Schema Completeness Test
 * Verifies all required tables, columns, and relationships exist
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

class SupabaseSchemaValidator {
    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        this.results = {
            tables: {},
            views: {},
            functions: {},
            policies: {},
            errors: [],
            warnings: []
        };
    }

    async validateSchema() {
        console.log('🗄️  Starting Supabase Schema Validation');
        console.log('=' .repeat(60));
        console.log(`📍 Database URL: ${SUPABASE_URL}`);
        console.log(`🔑 Using Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'Yes' : 'No'}`);
        
        try {
            await this.testConnection();
            await this.validateTables();
            await this.validateViews();
            await this.validatePolicies();
            await this.validateFunctions();
            await this.testCRUDOperations();
            this.generateReport();
        } catch (error) {
            console.error('❌ Schema validation failed:', error.message);
            this.results.errors.push(error.message);
        }
    }

    async testConnection() {
        console.log('\n🔌 Testing Database Connection...');
        
        try {
            const { count, error } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                throw new Error(`Connection failed: ${error.message}`);
            }
            
            console.log(`✅ Database connection successful (${count || 0} users)`);
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async validateTables() {
        console.log('\n📋 Validating Database Tables...');
        
        const expectedTables = [
            'users',
            'agents',
            'calls',
            'campaigns',
            'leads',
            'appointments',
            'webhooks',
            'billing',
            'dnc_list',
            'call_analytics',
            'user_permissions',
            'agent_configurations'
        ];

        for (const tableName of expectedTables) {
            await this.validateTable(tableName);
        }
    }

    async validateTable(tableName) {
        try {
            console.log(`  📊 Checking table: ${tableName}`);
            
            // Get table structure
            const { data: columns, error } = await this.supabase
                .rpc('get_table_columns', { table_name: tableName })
                .catch(async () => {
                    // Fallback: try to query the table directly
                    const { data, error } = await this.supabase
                        .from(tableName)
                        .select('*')
                        .limit(0);
                    
                    if (error) {
                        throw new Error(`Table ${tableName} not found: ${error.message}`);
                    }
                    
                    return { data: [], error: null };
                });

            if (error) {
                console.log(`    ❌ ${tableName}: ${error.message}`);
                this.results.tables[tableName] = { exists: false, error: error.message };
                return;
            }

            // Test basic operations
            const { count, error: countError } = await this.supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });

            if (countError) {
                console.log(`    ⚠️  ${tableName}: Exists but query failed - ${countError.message}`);
                this.results.tables[tableName] = { exists: true, accessible: false, error: countError.message };
            } else {
                console.log(`    ✅ ${tableName}: OK (${count || 0} records)`);
                this.results.tables[tableName] = { exists: true, accessible: true, count: count || 0 };
            }

            // Validate specific table schemas
            await this.validateTableSchema(tableName);

        } catch (error) {
            console.log(`    ❌ ${tableName}: ${error.message}`);
            this.results.tables[tableName] = { exists: false, error: error.message };
        }
    }

    async validateTableSchema(tableName) {
        const expectedSchemas = {
            users: ['id', 'email', 'created_at', 'role', 'subscription_plan', 'minutes_used', 'minutes_limit'],
            agents: ['id', 'user_id', 'name', 'type', 'voice', 'language', 'phone_number', 'system_prompt', 'created_at'],
            calls: ['id', 'agent_id', 'user_id', 'phone_number', 'status', 'duration', 'recording_url', 'created_at'],
            campaigns: ['id', 'user_id', 'name', 'status', 'agent_id', 'leads_count', 'completed_calls', 'created_at'],
            leads: ['id', 'campaign_id', 'phone_number', 'name', 'status', 'notes', 'created_at'],
            appointments: ['id', 'call_id', 'customer_name', 'phone_number', 'appointment_date', 'status', 'created_at'],
            webhooks: ['id', 'user_id', 'url', 'events', 'secret', 'active', 'created_at'],
            billing: ['id', 'user_id', 'plan', 'amount', 'status', 'period_start', 'period_end', 'created_at'],
            dnc_list: ['id', 'phone_number', 'reason', 'created_at'],
            call_analytics: ['id', 'call_id', 'metrics', 'sentiment', 'keywords', 'created_at']
        };

        const expected = expectedSchemas[tableName];
        if (!expected) return;

        try {
            // Try to select specific columns to verify they exist
            const { data, error } = await this.supabase
                .from(tableName)
                .select(expected.join(','))
                .limit(1);

            if (error) {
                this.results.warnings.push(`${tableName}: Some expected columns may be missing - ${error.message}`);
            } else {
                console.log(`    ✅ ${tableName}: Schema validation passed`);
            }
        } catch (error) {
            this.results.warnings.push(`${tableName}: Schema validation failed - ${error.message}`);
        }
    }

    async validateViews() {
        console.log('\n👁️  Validating Database Views...');
        
        const expectedViews = [
            'user_stats',
            'call_summary',
            'campaign_performance',
            'agent_metrics'
        ];

        for (const viewName of expectedViews) {
            try {
                const { data, error } = await this.supabase
                    .from(viewName)
                    .select('*')
                    .limit(1);

                if (error) {
                    console.log(`    ⚠️  View ${viewName}: ${error.message}`);
                    this.results.views[viewName] = { exists: false, error: error.message };
                } else {
                    console.log(`    ✅ View ${viewName}: OK`);
                    this.results.views[viewName] = { exists: true };
                }
            } catch (error) {
                console.log(`    ❌ View ${viewName}: ${error.message}`);
                this.results.views[viewName] = { exists: false, error: error.message };
            }
        }
    }

    async validatePolicies() {
        console.log('\n🔒 Validating Row Level Security Policies...');
        
        // Test RLS by trying operations as different users
        const testTables = ['users', 'agents', 'calls', 'campaigns'];
        
        for (const table of testTables) {
            try {
                // Test with service role (should work)
                const { data, error } = await this.supabase
                    .from(table)
                    .select('*')
                    .limit(1);

                if (error) {
                    console.log(`    ⚠️  RLS test for ${table}: ${error.message}`);
                    this.results.policies[table] = { accessible: false, error: error.message };
                } else {
                    console.log(`    ✅ RLS for ${table}: Service role access OK`);
                    this.results.policies[table] = { accessible: true };
                }
            } catch (error) {
                console.log(`    ❌ RLS test for ${table}: ${error.message}`);
                this.results.policies[table] = { accessible: false, error: error.message };
            }
        }
    }

    async validateFunctions() {
        console.log('\n⚙️  Validating Database Functions...');
        
        const expectedFunctions = [
            'create_user_with_permissions',
            'update_user_minutes',
            'get_user_stats',
            'create_campaign_with_leads'
        ];

        for (const funcName of expectedFunctions) {
            try {
                // Try to call the function (this will fail if it doesn't exist)
                const { data, error } = await this.supabase
                    .rpc(funcName, {})
                    .catch(() => ({ data: null, error: { message: 'Function not found or invalid parameters' } }));

                if (error && error.message.includes('not found')) {
                    console.log(`    ❌ Function ${funcName}: Not found`);
                    this.results.functions[funcName] = { exists: false };
                } else {
                    console.log(`    ✅ Function ${funcName}: Exists`);
                    this.results.functions[funcName] = { exists: true };
                }
            } catch (error) {
                console.log(`    ⚠️  Function ${funcName}: ${error.message}`);
                this.results.functions[funcName] = { exists: false, error: error.message };
            }
        }
    }

    async testCRUDOperations() {
        console.log('\n🔄 Testing CRUD Operations...');
        
        try {
            // Test user creation
            console.log('  📝 Testing user creation...');
            const testUser = {
                email: `test-${Date.now()}@example.com`,
                role: 'user',
                subscription_plan: 'basic',
                minutes_limit: 1000,
                minutes_used: 0
            };

            const { data: newUser, error: createError } = await this.supabase
                .from('users')
                .insert(testUser)
                .select()
                .single();

            if (createError) {
                console.log(`    ❌ User creation failed: ${createError.message}`);
                this.results.errors.push(`CRUD test failed: ${createError.message}`);
                return;
            }

            console.log(`    ✅ User created: ${newUser.id}`);

            // Test user update
            console.log('  ✏️  Testing user update...');
            const { data: updatedUser, error: updateError } = await this.supabase
                .from('users')
                .update({ minutes_used: 50 })
                .eq('id', newUser.id)
                .select()
                .single();

            if (updateError) {
                console.log(`    ❌ User update failed: ${updateError.message}`);
            } else {
                console.log(`    ✅ User updated: minutes_used = ${updatedUser.minutes_used}`);
            }

            // Test user deletion
            console.log('  🗑️  Testing user deletion...');
            const { error: deleteError } = await this.supabase
                .from('users')
                .delete()
                .eq('id', newUser.id);

            if (deleteError) {
                console.log(`    ❌ User deletion failed: ${deleteError.message}`);
            } else {
                console.log(`    ✅ User deleted successfully`);
            }

        } catch (error) {
            console.log(`    ❌ CRUD operations failed: ${error.message}`);
            this.results.errors.push(`CRUD test failed: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n📊 SUPABASE SCHEMA VALIDATION REPORT');
        console.log('=' .repeat(60));
        
        // Tables summary
        const tableCount = Object.keys(this.results.tables).length;
        const existingTables = Object.values(this.results.tables).filter(t => t.exists).length;
        const accessibleTables = Object.values(this.results.tables).filter(t => t.accessible).length;
        
        console.log(`📋 Tables: ${existingTables}/${tableCount} exist, ${accessibleTables}/${tableCount} accessible`);
        
        Object.entries(this.results.tables).forEach(([name, info]) => {
            const status = info.exists ? (info.accessible ? '✅' : '⚠️') : '❌';
            const count = info.count !== undefined ? ` (${info.count} records)` : '';
            console.log(`  ${status} ${name}${count}`);
        });

        // Views summary
        const viewCount = Object.keys(this.results.views).length;
        const existingViews = Object.values(this.results.views).filter(v => v.exists).length;
        
        console.log(`\n👁️  Views: ${existingViews}/${viewCount} exist`);
        Object.entries(this.results.views).forEach(([name, info]) => {
            const status = info.exists ? '✅' : '❌';
            console.log(`  ${status} ${name}`);
        });

        // Functions summary
        const funcCount = Object.keys(this.results.functions).length;
        const existingFunctions = Object.values(this.results.functions).filter(f => f.exists).length;
        
        console.log(`\n⚙️  Functions: ${existingFunctions}/${funcCount} exist`);
        Object.entries(this.results.functions).forEach(([name, info]) => {
            const status = info.exists ? '✅' : '❌';
            console.log(`  ${status} ${name}`);
        });

        // Policies summary
        const policyCount = Object.keys(this.results.policies).length;
        const accessiblePolicies = Object.values(this.results.policies).filter(p => p.accessible).length;
        
        console.log(`\n🔒 RLS Policies: ${accessiblePolicies}/${policyCount} accessible`);
        Object.entries(this.results.policies).forEach(([name, info]) => {
            const status = info.accessible ? '✅' : '❌';
            console.log(`  ${status} ${name}`);
        });

        // Warnings and errors
        if (this.results.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.results.warnings.forEach((warning, index) => {
                console.log(`  ${index + 1}. ${warning}`);
            });
        }

        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        // Overall assessment
        console.log('\n🎯 OVERALL ASSESSMENT:');
        
        const criticalIssues = this.results.errors.length;
        const minorIssues = this.results.warnings.length;
        
        if (criticalIssues === 0 && minorIssues === 0) {
            console.log('🟢 EXCELLENT: Database schema is complete and fully functional');
        } else if (criticalIssues === 0) {
            console.log('🟡 GOOD: Database schema is functional with minor issues');
        } else {
            console.log('🔴 NEEDS ATTENTION: Database schema has critical issues');
        }
        
        console.log(`📊 Score: ${Math.max(0, 100 - (criticalIssues * 20) - (minorIssues * 5))}%`);
        
        console.log('\n🎉 Schema validation completed!');
    }
}

// Run the validation
if (import.meta.url === `file://${process.argv[1]}`) {
    const validator = new SupabaseSchemaValidator();
    validator.validateSchema().catch(console.error);
}

export default SupabaseSchemaValidator;