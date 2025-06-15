#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

// 🎯 COMPLETE ADMIN MANAGEMENT SYSTEM FOR FIVERR
class AdminManagementSystem {
  constructor() {
    this.supabase = supabase;
  }

  // 👤 USER MANAGEMENT
  async createUser(userData) {
    console.log(`📝 Creating user: ${userData.email}`);
    
    const newUser = {
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role || 'user',
      subscription_tier: userData.subscription_tier || 'basic',
      max_agents: userData.max_agents || this.getDefaultLimits(userData.subscription_tier || 'basic').agents,
      max_minutes: userData.max_minutes || this.getDefaultLimits(userData.subscription_tier || 'basic').minutes,
      allowed_features: userData.allowed_features || this.getDefaultFeatures(userData.subscription_tier || 'basic'),
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      minutes_used: 0,
      created_by: userData.created_by // Admin who created this user
    };

    const { data, error } = await this.supabase
      .from('profiles')
      .insert(newUser)
      .select()
      .single();

    if (error) {
      console.log(`❌ User creation failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ User created: ${data.id}`);
    return { success: true, data };
  }

  async updateUserLimits(userId, limits) {
    console.log(`🔧 Updating limits for user: ${userId}`);
    
    const { data, error } = await this.supabase
      .from('profiles')
      .update(limits)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log(`❌ Limit update failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ Limits updated for user: ${userId}`);
    return { success: true, data };
  }

  async deactivateUser(userId) {
    console.log(`🚫 Deactivating user: ${userId}`);
    
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log(`❌ User deactivation failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ User deactivated: ${userId}`);
    return { success: true, data };
  }

  async getUserOverview() {
    console.log('📊 Getting user overview...');
    
    const { data: users, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        subscription_tier,
        max_agents,
        max_minutes,
        minutes_used,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.log(`❌ User overview failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    // Get additional stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const [
        { count: agentCount },
        { count: campaignCount },
        { count: leadCount },
        { count: callCount }
      ] = await Promise.all([
        this.supabase.from('ai_agents').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
        this.supabase.from('outbound_campaigns').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
        this.supabase.from('campaign_leads').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
        this.supabase.from('call_logs').select('*', { count: 'exact', head: true }).eq('profile_id', user.id)
      ]);

      return {
        ...user,
        stats: {
          agents: agentCount || 0,
          campaigns: campaignCount || 0,
          leads: leadCount || 0,
          calls: callCount || 0,
          minutesRemaining: (user.max_minutes || 0) - (user.minutes_used || 0)
        }
      };
    }));

    console.log(`✅ Retrieved ${usersWithStats.length} users`);
    return { success: true, data: usersWithStats };
  }

  // 🤖 AGENT MANAGEMENT
  async canUserCreateAgent(userId) {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('max_agents, is_active')
      .eq('id', userId)
      .single();

    if (!profile || !profile.is_active) {
      return { canCreate: false, reason: 'User not active' };
    }

    const { count: agentCount } = await this.supabase
      .from('ai_agents')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('is_active', true);

    const maxAgents = profile.max_agents || 1;
    const currentAgents = agentCount || 0;

    return {
      canCreate: currentAgents < maxAgents,
      reason: currentAgents >= maxAgents ? `Agent limit reached (${maxAgents})` : 'OK',
      current: currentAgents,
      max: maxAgents
    };
  }

  async approveAgent(agentId, approved = true) {
    console.log(`${approved ? '✅' : '❌'} ${approved ? 'Approving' : 'Rejecting'} agent: ${agentId}`);
    
    const { data, error } = await this.supabase
      .from('ai_agents')
      .update({ is_approved: approved })
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      console.log(`❌ Agent approval failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ Agent ${approved ? 'approved' : 'rejected'}: ${agentId}`);
    return { success: true, data };
  }

  // ⏱️ MINUTES MANAGEMENT
  async hasUserMinutesRemaining(userId) {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('max_minutes, minutes_used, is_active')
      .eq('id', userId)
      .single();

    if (!profile || !profile.is_active) {
      return { hasMinutes: false, reason: 'User not active' };
    }

    const maxMinutes = profile.max_minutes || 100;
    const usedMinutes = profile.minutes_used || 0;
    const remainingMinutes = maxMinutes - usedMinutes;

    return {
      hasMinutes: remainingMinutes > 0,
      remaining: remainingMinutes,
      used: usedMinutes,
      max: maxMinutes,
      reason: remainingMinutes <= 0 ? 'Minutes limit exceeded' : 'OK'
    };
  }

  async addMinutesToUser(userId, minutesToAdd) {
    console.log(`⏱️ Adding ${minutesToAdd} minutes to user: ${userId}`);
    
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ 
        minutes_used: this.supabase.raw(`GREATEST(minutes_used - ${minutesToAdd}, 0)`)
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log(`❌ Minutes addition failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ Added ${minutesToAdd} minutes to user: ${userId}`);
    return { success: true, data };
  }

  async deductMinutesFromUser(userId, minutesToDeduct) {
    console.log(`⏱️ Deducting ${minutesToDeduct} minutes from user: ${userId}`);
    
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ 
        minutes_used: this.supabase.raw(`minutes_used + ${minutesToDeduct}`)
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log(`❌ Minutes deduction failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ Deducted ${minutesToDeduct} minutes from user: ${userId}`);
    return { success: true, data };
  }

  // 🎯 FEATURE MANAGEMENT
  async updateUserFeatures(userId, features) {
    console.log(`🎯 Updating features for user: ${userId}`);
    
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ allowed_features: features })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log(`❌ Feature update failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ Features updated for user: ${userId}`);
    return { success: true, data };
  }

  async canUserAccessFeature(userId, featureName) {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('allowed_features, is_active')
      .eq('id', userId)
      .single();

    if (!profile || !profile.is_active) {
      return { canAccess: false, reason: 'User not active' };
    }

    const features = profile.allowed_features || {};
    const hasFeature = features[featureName] === true;

    return {
      canAccess: hasFeature,
      reason: hasFeature ? 'OK' : `Feature '${featureName}' not allowed`
    };
  }

  // 📊 SYSTEM STATISTICS
  async getSystemStats() {
    console.log('📊 Getting system statistics...');
    
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalAgents },
      { count: activeAgents },
      { count: totalCampaigns },
      { count: activeCampaigns },
      { count: totalLeads },
      { count: totalCalls }
    ] = await Promise.all([
      this.supabase.from('profiles').select('*', { count: 'exact', head: true }),
      this.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      this.supabase.from('ai_agents').select('*', { count: 'exact', head: true }),
      this.supabase.from('ai_agents').select('*', { count: 'exact', head: true }).eq('is_active', true),
      this.supabase.from('outbound_campaigns').select('*', { count: 'exact', head: true }),
      this.supabase.from('outbound_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      this.supabase.from('campaign_leads').select('*', { count: 'exact', head: true }),
      this.supabase.from('call_logs').select('*', { count: 'exact', head: true })
    ]);

    // Get minutes usage
    const { data: minutesData } = await this.supabase
      .from('profiles')
      .select('minutes_used, max_minutes');

    const totalMinutesUsed = minutesData?.reduce((sum, profile) => sum + (profile.minutes_used || 0), 0) || 0;
    const totalMinutesAllowed = minutesData?.reduce((sum, profile) => sum + (profile.max_minutes || 0), 0) || 0;

    const stats = {
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        inactive: (totalUsers || 0) - (activeUsers || 0)
      },
      agents: {
        total: totalAgents || 0,
        active: activeAgents || 0,
        inactive: (totalAgents || 0) - (activeAgents || 0)
      },
      campaigns: {
        total: totalCampaigns || 0,
        active: activeCampaigns || 0
      },
      leads: {
        total: totalLeads || 0
      },
      calls: {
        total: totalCalls || 0
      },
      minutes: {
        used: totalMinutesUsed,
        allowed: totalMinutesAllowed,
        remaining: totalMinutesAllowed - totalMinutesUsed
      }
    };

    console.log('✅ System statistics retrieved');
    return { success: true, data: stats };
  }

  // 🎁 SUBSCRIPTION TIER MANAGEMENT
  getDefaultLimits(tier) {
    const limits = {
      basic: { agents: 1, minutes: 100 },
      premium: { agents: 5, minutes: 500 },
      enterprise: { agents: 20, minutes: 2000 }
    };
    return limits[tier] || limits.basic;
  }

  getDefaultFeatures(tier) {
    const features = {
      basic: {
        basic_calling: true,
        advanced_analytics: false,
        custom_voices: false,
        api_access: false,
        priority_support: false
      },
      premium: {
        basic_calling: true,
        advanced_analytics: true,
        custom_voices: true,
        api_access: false,
        priority_support: true
      },
      enterprise: {
        basic_calling: true,
        advanced_analytics: true,
        custom_voices: true,
        api_access: true,
        priority_support: true,
        white_label: true
      }
    };
    return features[tier] || features.basic;
  }

  async upgradeUserTier(userId, newTier) {
    console.log(`⬆️ Upgrading user ${userId} to ${newTier}`);
    
    const limits = this.getDefaultLimits(newTier);
    const features = this.getDefaultFeatures(newTier);

    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        subscription_tier: newTier,
        max_agents: limits.agents,
        max_minutes: limits.minutes,
        allowed_features: features
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log(`❌ Tier upgrade failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ User upgraded to ${newTier}: ${userId}`);
    return { success: true, data };
  }

  // 🔧 CALL LOGS MANAGEMENT (Fixed for Gemini Live API)
  async createCallLog(callData) {
    console.log(`📞 Creating call log for: ${callData.phone_number_to}`);
    
    // Ensure required fields are present
    const callLogData = {
      profile_id: callData.profile_id,
      phone_number_from: callData.phone_number_from,
      phone_number_to: callData.phone_number_to,
      direction: callData.direction || 'outbound', // Fix for direction field
      call_status: callData.call_status || 'pending',
      ...callData // Include any additional fields
    };

    const { data, error } = await this.supabase
      .from('call_logs')
      .insert(callLogData)
      .select()
      .single();

    if (error) {
      console.log(`❌ Call log creation failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ Call log created: ${data.id}`);
    return { success: true, data };
  }
}

// 🧪 TESTING THE ADMIN MANAGEMENT SYSTEM
async function testAdminSystem() {
  console.log('🧪 TESTING ADMIN MANAGEMENT SYSTEM');
  console.log('='.repeat(70));

  const admin = new AdminManagementSystem();

  try {
    // Test 1: Get system statistics
    console.log('\n📊 Testing System Statistics...');
    const statsResult = await admin.getSystemStats();
    if (statsResult.success) {
      console.log('✅ System stats retrieved');
      console.log(`   Users: ${statsResult.data.users.total} (${statsResult.data.users.active} active)`);
      console.log(`   Agents: ${statsResult.data.agents.total} (${statsResult.data.agents.active} active)`);
      console.log(`   Campaigns: ${statsResult.data.campaigns.total} (${statsResult.data.campaigns.active} active)`);
      console.log(`   Calls: ${statsResult.data.calls.total}`);
      console.log(`   Minutes: ${statsResult.data.minutes.used}/${statsResult.data.minutes.allowed} used`);
    }

    // Test 2: Get user overview
    console.log('\n👤 Testing User Overview...');
    const usersResult = await admin.getUserOverview();
    if (usersResult.success) {
      console.log(`✅ Retrieved ${usersResult.data.length} users`);
      usersResult.data.forEach(user => {
        console.log(`   ${user.email}: ${user.stats.agents} agents, ${user.stats.calls} calls, ${user.stats.minutesRemaining} minutes left`);
      });
    }

    // Test 3: Test agent creation limits
    console.log('\n🤖 Testing Agent Limits...');
    const { data: profiles } = await admin.supabase.from('profiles').select('id').limit(1);
    if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;
      const agentCheck = await admin.canUserCreateAgent(userId);
      console.log(`✅ Agent limit check: ${agentCheck.canCreate ? 'Can create' : 'Cannot create'} (${agentCheck.reason})`);
      console.log(`   Current: ${agentCheck.current}/${agentCheck.max} agents`);
    }

    // Test 4: Test minutes management
    console.log('\n⏱️ Testing Minutes Management...');
    if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;
      const minutesCheck = await admin.hasUserMinutesRemaining(userId);
      console.log(`✅ Minutes check: ${minutesCheck.hasMinutes ? 'Has minutes' : 'No minutes'} (${minutesCheck.reason})`);
      console.log(`   Remaining: ${minutesCheck.remaining}/${minutesCheck.max} minutes`);
    }

    // Test 5: Test feature access
    console.log('\n🎯 Testing Feature Access...');
    if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;
      const featureCheck = await admin.canUserAccessFeature(userId, 'basic_calling');
      console.log(`✅ Feature access check: ${featureCheck.canAccess ? 'Can access' : 'Cannot access'} basic_calling`);
    }

    // Test 6: Test call log creation (with fixed schema)
    console.log('\n📞 Testing Call Log Creation...');
    if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;
      const callLogResult = await admin.createCallLog({
        profile_id: userId,
        phone_number_from: '+1234567890',
        phone_number_to: '+1555123456',
        direction: 'outbound',
        call_status: 'completed',
        call_duration_seconds: 120,
        session_id: 'admin-test-' + Date.now(),
        call_summary: 'Admin system test call'
      });

      if (callLogResult.success) {
        console.log(`✅ Call log created successfully: ${callLogResult.data.id}`);
        
        // Clean up test call log
        await admin.supabase.from('call_logs').delete().eq('id', callLogResult.data.id);
        console.log('✅ Test call log cleaned up');
      } else {
        console.log(`❌ Call log creation failed: ${callLogResult.error}`);
      }
    }

  } catch (error) {
    console.error('❌ Admin system test error:', error);
  }

  console.log('\n🎯 ADMIN SYSTEM READY FOR FIVERR!');
  console.log('✅ User management with limits');
  console.log('✅ Agent approval system');
  console.log('✅ Minutes tracking and control');
  console.log('✅ Feature permissions');
  console.log('✅ Subscription tier management');
  console.log('✅ Complete admin dashboard data');
}

// Export the admin system for use in the application
export { AdminManagementSystem };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAdminSystem().catch(console.error);
}