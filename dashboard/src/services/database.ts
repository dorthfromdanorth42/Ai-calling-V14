import { supabase } from '../lib/supabase'
import type { 
  Profile, 
  CallLog, 
  Campaign, 
  CampaignLead, 
  AnalyticsData,
  DNCEntry,
  WebhookEndpoint,
  WebhookDelivery,
  Subscription,
  UsageRecord,

  SystemStatus,
  AIAgent,
  Appointment
} from '../lib/supabase'

export class DatabaseService {
  // Check if we're in demo mode
  private static isDemoMode(): boolean {
    // Get the current mode from localStorage (set by AppContext)
    const appMode = localStorage.getItem('app_mode')
    return appMode === 'demo'
  }

  // Profile operations
  static async getProfile(userId: string): Promise<Profile | null> {
    if (this.isDemoMode()) {
      return this.getDemoProfile()
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      throw error
    }

    return data
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Profile update simulated')
      return { ...this.getDemoProfile(), ...updates }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      throw error
    }

    return data
  }

  static async getUserSettings(userId: string): Promise<any> {
    if (this.isDemoMode()) {
      return {
        twilio_phone_number: '+18553947135',
        twilio_account_sid: 'demo_sid',
        gemini_api_key: 'demo_key'
      }
    }

    const profile = await this.getProfile(userId)
    return {
      twilio_phone_number: profile?.twilio_phone_number,
      twilio_account_sid: profile?.twilio_account_sid,
      gemini_api_key: profile?.gemini_api_key
    }
  }

  // AI Agents operations
  static async getAIAgents(profileId: string): Promise<AIAgent[]> {
    if (this.isDemoMode()) {
      return this.getDemoAgents()
    }

    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching AI agents:', error)
      // In live mode, return empty array instead of demo data
      return []
    }

    return data || []
  }

  static async createAIAgent(agent: Omit<AIAgent, 'id' | 'created_at' | 'updated_at'>): Promise<AIAgent | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: AI agent creation simulated')
      return {
        ...agent,
        id: 'demo-agent-' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('ai_agents')
      .insert(agent)
      .select()
      .single()

    if (error) {
      console.error('Error creating AI agent:', error)
      throw error
    }

    return data
  }

  static async updateAIAgent(id: string, updates: Partial<AIAgent>): Promise<AIAgent | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: AI agent update simulated')
      return null
    }

    const { data, error } = await supabase
      .from('ai_agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating AI agent:', error)
      throw error
    }

    return data
  }

  static async deleteAIAgent(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      console.log('Demo mode: AI agent deletion simulated')
      return true
    }

    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting AI agent:', error)
      throw error
    }

    return true
  }

  // Call logs operations
  static async getCallLogs(profileId: string, limit = 50, offset = 0): Promise<CallLog[]> {
    if (this.isDemoMode()) {
      return this.getDemoCallLogs()
    }

    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        outbound_campaigns(name)
      `)
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching call logs:', error)
      // In live mode, return empty array instead of demo data
      return []
    }

    return data || []
  }

  static async getActiveCallLogs(profileId: string): Promise<CallLog[]> {
    if (this.isDemoMode()) {
      return this.getDemoCallLogs().filter(call => call.status === 'in_progress')
    }

    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Error fetching active calls:', error)
      return []
    }

    return data || []
  }

  static async createCallLog(callLog: Omit<CallLog, 'id' | 'created_at'>): Promise<CallLog | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Call log creation simulated')
      return null
    }

    const { data, error } = await supabase
      .from('call_logs')
      .insert(callLog)
      .select()
      .single()

    if (error) {
      console.error('Error creating call log:', error)
      throw error
    }

    return data
  }

  static async updateCallLog(id: string, updates: Partial<CallLog>): Promise<CallLog | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Call log update simulated')
      return null
    }

    const { data, error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating call log:', error)
      throw error
    }

    return data
  }

  // Campaign operations
  static async getCampaigns(profileId: string): Promise<Campaign[]> {
    if (this.isDemoMode()) {
      return this.getDemoCampaigns()
    }

    const { data, error } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaigns:', error)
      return []
    }

    return data || []
  }

  static async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Campaign creation simulated')
      // Return a mock campaign object instead of null to prevent frontend errors
      return {
        ...campaign,
        id: 'demo-campaign-' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Campaign
    }

    const { data, error } = await supabase
      .from('outbound_campaigns')
      .insert(campaign)
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      throw error
    }

    return data
  }

  static async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Campaign update simulated')
      return null
    }

    const { data, error } = await supabase
      .from('outbound_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign:', error)
      throw error
    }

    return data
  }

  static async deleteCampaign(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Campaign deletion simulated')
      return true
    }

    const { error } = await supabase
      .from('outbound_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting campaign:', error)
      throw error
    }

    return true
  }

  // Campaign leads operations
  static async getCampaignLeads(campaignId: string, limit = 100, offset = 0): Promise<CampaignLead[]> {
    if (this.isDemoMode()) {
      return this.getDemoCampaignLeads()
    }

    const { data, error } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching campaign leads:', error)
      return []
    }

    return data || []
  }

  // Appointments operations
  static async getAppointments(profileId: string): Promise<Appointment[]> {
    if (this.isDemoMode()) {
      return this.getDemoAppointments()
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('profile_id', profileId)
      .order('scheduled_date', { ascending: true })

    if (error) {
      console.error('Error fetching appointments:', error)
      return []
    }

    return data || []
  }

  static async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Appointment creation simulated')
      return null
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      throw error
    }

    return data
  }

  static async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Appointment update simulated')
      return null
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating appointment:', error)
      throw error
    }

    return data
  }

  static async deleteAppointment(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Appointment deletion simulated')
      return true
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting appointment:', error)
      throw error
    }

    return true
  }

  // Live Call Monitoring operations
  static async getActiveCalls(profileId: string): Promise<any[]> {
    if (this.isDemoMode()) {
      return this.getDemoActiveCalls()
    }

    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        ai_agents!inner(name, agent_type, voice_name)
      `)
      .eq('profile_id', profileId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Error fetching active calls:', error)
      return []
    }

    return (data || []).map(call => ({
      id: call.id,
      agent_id: call.agent_id,
      agent_name: call.ai_agents?.name || 'Unknown Agent',
      phone_number_from: call.phone_number_from,
      phone_number_to: call.phone_number_to,
      direction: call.direction,
      status: call.status,
      started_at: call.started_at,
      duration_seconds: Math.floor((new Date().getTime() - new Date(call.started_at).getTime()) / 1000),
      customer_name: call.customer_name,
      call_quality: this.getRandomCallQuality()
    }))
  }

  static async getAgentStatuses(profileId: string): Promise<any[]> {
    if (this.isDemoMode()) {
      return this.getDemoAgentStatuses()
    }

    const { data, error } = await supabase
      .from('ai_agents')
      .select(`
        *,
        call_logs!left(id, status)
      `)
      .eq('profile_id', profileId)

    if (error) {
      console.error('Error fetching agent statuses:', error)
      return []
    }

    return (data || []).map(agent => {
      const activeCalls = agent.call_logs?.filter((call: any) => call.status === 'in_progress') || []
      return {
        id: agent.id,
        name: agent.name,
        agent_type: agent.agent_type,
        voice_name: agent.voice_name,
        is_active: agent.is_active,
        current_calls: activeCalls.length,
        max_concurrent_calls: agent.max_concurrent_calls || 1,
        status: agent.is_active ? (activeCalls.length > 0 ? 'busy' : 'available') : 'offline',
        last_call_at: agent.updated_at
      }
    })
  }

  static async getCallQueue(profileId: string): Promise<any[]> {
    if (this.isDemoMode()) {
      return this.getDemoCallQueue()
    }

    const { data, error } = await supabase
      .from('call_queues')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'waiting')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching call queue:', error)
      return []
    }

    return (data || []).map(item => ({
      id: item.id,
      phone_number: item.phone_number,
      customer_name: item.customer_name,
      priority: item.priority || 'normal',
      wait_time_seconds: Math.floor((new Date().getTime() - new Date(item.created_at).getTime()) / 1000),
      agent_type_requested: item.agent_type_requested
    }))
  }

  static async emergencyStopAllCalls(profileId: string): Promise<boolean> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Emergency stop simulated')
      return true
    }

    const { error } = await supabase
      .from('call_logs')
      .update({ 
        status: 'failed',
        ended_at: new Date().toISOString(),
        outcome: 'emergency_stop'
      })
      .eq('profile_id', profileId)
      .eq('status', 'in_progress')

    if (error) {
      console.error('Error stopping calls:', error)
      throw error
    }

    return true
  }

  static async toggleAgent(agentId: string, isActive: boolean): Promise<boolean> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Agent toggle simulated')
      return true
    }

    const { error } = await supabase
      .from('ai_agents')
      .update({ is_active: isActive })
      .eq('id', agentId)

    if (error) {
      console.error('Error toggling agent:', error)
      throw error
    }

    return true
  }

  // Analytics operations
  static async getAnalytics(profileId: string): Promise<AnalyticsData> {
    if (this.isDemoMode()) {
      return this.getDemoAnalytics()
    }

    try {
      // Get analytics using the database function
      const { data, error } = await supabase.rpc('get_user_analytics', {
        user_id: profileId,
        days_back: 30
      })

      if (error) {
        console.error('Error fetching analytics:', error)
        // Return empty analytics in live mode
        return this.getEmptyAnalytics()
      }

      return data || this.getEmptyAnalytics()
    } catch (error) {
      console.error('Error fetching analytics:', error)
      return this.getEmptyAnalytics()
    }
  }

  // DNC operations
  static async getDNCEntries(profileId: string): Promise<DNCEntry[]> {
    if (this.isDemoMode()) {
      return []
    }

    const { data, error } = await supabase
      .from('dnc_lists')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching DNC entries:', error)
      return []
    }

    return data || []
  }

  static async addDNCEntry(entry: Omit<DNCEntry, 'id' | 'created_at'>): Promise<DNCEntry> {
    if (this.isDemoMode()) {
      throw new Error('DNC management not available in demo mode')
    }

    const { data, error } = await supabase
      .from('dnc_lists')
      .insert(entry)
      .select()
      .single()

    if (error) {
      console.error('Error adding DNC entry:', error)
      throw error
    }

    return data
  }

  static async deleteDNCEntry(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      throw new Error('DNC management not available in demo mode')
    }

    const { error } = await supabase
      .from('dnc_lists')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting DNC entry:', error)
      throw error
    }

    return true
  }

  // Webhook operations
  static async getWebhookEndpoints(profileId: string): Promise<WebhookEndpoint[]> {
    if (this.isDemoMode()) {
      return []
    }

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching webhook endpoints:', error)
      return []
    }

    return data || []
  }

  static async getWebhookDeliveries(profileId: string): Promise<WebhookDelivery[]> {
    if (this.isDemoMode()) {
      return []
    }

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select(`
        *,
        webhook_endpoints!inner(profile_id)
      `)
      .eq('webhook_endpoints.profile_id', profileId)
      .order('delivered_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching webhook deliveries:', error)
      return []
    }

    return data || []
  }

  // System status
  static async getSystemStatus(): Promise<SystemStatus[]> {
    if (this.isDemoMode()) {
      return this.getDemoSystemStatus()
    }

    const { data, error } = await supabase
      .from('system_status')
      .select('*')
      .is('resolved_at', null)
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Error fetching system status:', error)
      return []
    }

    return data || []
  }

  // Demo data methods
  private static getDemoProfile(): Profile {
    return {
      id: 'demo-user-1',
      email: 'demo@example.com',
      client_name: 'Demo User',
      company_name: 'AI Call Center Demo',
      phone_number: '+1 (555) 123-4567',
      plan_name: 'professional',
      monthly_minute_limit: 1000,
      minutes_used: 752,
      is_active: true,
      can_use_inbound: true,
      can_use_outbound_dialer: true,
      max_concurrent_calls: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-10T00:00:00Z'
    }
  }

  private static getDemoAgents(): AIAgent[] {
    return [
      {
        id: 'agent-1',
        profile_id: 'demo-user-1',
        name: 'Customer Service Agent',
        description: 'Primary customer service agent for general inquiries',
        agent_type: 'customer_service',
        voice_name: 'Puck',
        language_code: 'en-US',
        system_instruction: 'You are a professional customer service representative.',
        twilio_phone_number: '+1 (555) 0001',
        is_active: true,
        max_concurrent_calls: 2,
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        business_days: [1, 2, 3, 4, 5],
        timezone: 'UTC',
        escalation_enabled: true,
        escalation_type: 'human_agent',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'agent-2',
        profile_id: 'demo-user-1',
        name: 'Sales Agent',
        description: 'Outbound sales agent for lead qualification',
        agent_type: 'sales',
        voice_name: 'Charon',
        language_code: 'en-US',
        system_instruction: 'You are a professional sales representative.',
        twilio_phone_number: '+1 (555) 0002',
        is_active: true,
        max_concurrent_calls: 1,
        business_hours_start: '09:00',
        business_hours_end: '18:00',
        business_days: [1, 2, 3, 4, 5],
        timezone: 'UTC',
        escalation_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  }

  private static getDemoCallLogs(): CallLog[] {
    return [
      {
        id: 'call-1',
        profile_id: 'demo-user-1',
        agent_id: 'agent-1',
        phone_number_from: '+1 (555) 123-4567',
        phone_number_to: '+1 (555) 987-6543',
        direction: 'inbound',
        status: 'completed',
        started_at: '2024-01-15T10:30:00Z',
        ended_at: '2024-01-15T10:34:23Z',
        duration_seconds: 263,
        call_summary: 'Customer inquiry about product features',
        sentiment_score: 0.8,
        outcome: 'Resolved',
        priority: 'normal',
        customer_satisfaction_score: 5,
        follow_up_required: false,
        tags: ['product-inquiry', 'resolved'],
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 'call-2',
        profile_id: 'demo-user-1',
        agent_id: 'agent-2',
        phone_number_from: '+1 (555) 987-6543',
        phone_number_to: '+1 (555) 456-7890',
        direction: 'outbound',
        status: 'in_progress',
        started_at: '2024-01-15T11:00:00Z',
        duration_seconds: 75,
        call_summary: 'Sales call in progress',
        priority: 'normal',
        follow_up_required: false,
        created_at: '2024-01-15T11:00:00Z'
      }
    ]
  }

  private static getDemoCampaigns(): Campaign[] {
    return [
      {
        id: 'campaign-1',
        profile_id: 'demo-user-1',
        agent_id: 'agent-2',
        name: 'Q1 Sales Outreach',
        description: 'Quarterly sales campaign for new prospects',
        status: 'active',
        caller_id: '+1 (555) 0002',
        max_concurrent_calls: 2,
        call_timeout_seconds: 30,
        retry_attempts: 3,
        retry_delay_minutes: 60,
        start_time: '09:00',
        end_time: '17:00',
        timezone: 'UTC',
        days_of_week: [1, 2, 3, 4, 5],
        priority: 'normal',
        total_leads: 500,
        leads_called: 156,
        leads_answered: 89,
        leads_completed: 45,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    ]
  }

  private static getDemoCampaignLeads(): CampaignLead[] {
    return [
      {
        id: 'lead-1',
        campaign_id: 'campaign-1',
        phone_number: '+1 (555) 111-2222',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        company: 'Acme Corp',
        status: 'completed',
        priority: 'normal',
        call_attempts: 1,
        last_call_at: '2024-01-15T10:00:00Z',
        outcome: 'Interested - Follow up scheduled',
        do_not_call: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      }
    ]
  }

  private static getDemoAppointments(): Appointment[] {
    return [
      {
        id: 'appointment-1',
        profile_id: 'demo-user-1',
        customer_name: 'Jane Smith',
        customer_phone: '+1 (555) 333-4444',
        customer_email: 'jane.smith@example.com',
        appointment_type: 'Product Demo',
        scheduled_date: '2024-01-20T14:00:00Z',
        duration_minutes: 30,
        location: 'Zoom Meeting',
        status: 'scheduled',
        reminder_sent: false,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    ]
  }

  private static getDemoAnalytics(): AnalyticsData {
    return {
      totalCalls: 247,
      totalMinutes: 1840,
      successfulCalls: 189,
      averageCallDuration: 447,
      callsByDay: [
        { date: '2024-01-08', count: 32 },
        { date: '2024-01-09', count: 28 },
        { date: '2024-01-10', count: 35 },
        { date: '2024-01-11', count: 41 },
        { date: '2024-01-12', count: 38 },
        { date: '2024-01-13', count: 29 },
        { date: '2024-01-14', count: 44 }
      ],
      callsByStatus: [
        { status: 'completed', count: 189 },
        { status: 'failed', count: 32 },
        { status: 'abandoned', count: 26 }
      ],
      topOutcomes: [
        { outcome: 'Resolved', count: 89 },
        { outcome: 'Follow-up scheduled', count: 45 },
        { outcome: 'Information provided', count: 32 },
        { outcome: 'Escalated', count: 23 }
      ],
      minutesUsed: 752,
      minutesLimit: 1000,
      campaignStats: {
        totalCampaigns: 3,
        activeCampaigns: 1,
        totalLeads: 1250,
        leadsContacted: 456
      }
    }
  }

  private static getEmptyAnalytics(): AnalyticsData {
    return {
      totalCalls: 0,
      totalMinutes: 0,
      successfulCalls: 0,
      averageCallDuration: 0,
      callsByDay: [],
      callsByStatus: [],
      topOutcomes: [],
      minutesUsed: 0,
      minutesLimit: 50000, // Default Enterprise plan limit
      campaignStats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        leadsContacted: 0
      }
    }
  }

  private static getDemoSystemStatus(): SystemStatus[] {
    return [
      {
        id: 'status-1',
        service_name: 'api',
        status: 'operational',
        started_at: '2024-01-15T00:00:00Z',
        created_at: '2024-01-15T00:00:00Z'
      },
      {
        id: 'status-2',
        service_name: 'calls',
        status: 'operational',
        started_at: '2024-01-15T00:00:00Z',
        created_at: '2024-01-15T00:00:00Z'
      }
    ]
  }

  private static getDemoActiveCalls(): any[] {
    return [
      {
        id: 'active-call-1',
        agent_id: 'agent-1',
        agent_name: 'Customer Service Agent',
        phone_number_from: '+1 (555) 123-4567',
        phone_number_to: '+1 (555) 987-6543',
        direction: 'inbound',
        status: 'in_progress',
        started_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        duration_seconds: 120,
        customer_name: 'Sarah Johnson',
        call_quality: 'excellent'
      },
      {
        id: 'active-call-2',
        agent_id: 'agent-2',
        agent_name: 'Sales Agent',
        phone_number_from: '+1 (555) 987-6543',
        phone_number_to: '+1 (555) 456-7890',
        direction: 'outbound',
        status: 'in_progress',
        started_at: new Date(Date.now() - 45000).toISOString(), // 45 seconds ago
        duration_seconds: 45,
        customer_name: 'Mike Chen',
        call_quality: 'good'
      }
    ]
  }

  private static getDemoAgentStatuses(): any[] {
    return [
      {
        id: 'agent-1',
        name: 'Customer Service Agent',
        agent_type: 'customer_service',
        voice_name: 'Puck',
        is_active: true,
        current_calls: 1,
        max_concurrent_calls: 3,
        status: 'busy',
        last_call_at: new Date(Date.now() - 120000).toISOString()
      },
      {
        id: 'agent-2',
        name: 'Sales Agent',
        agent_type: 'sales',
        voice_name: 'Charon',
        is_active: true,
        current_calls: 1,
        max_concurrent_calls: 2,
        status: 'busy',
        last_call_at: new Date(Date.now() - 45000).toISOString()
      },
      {
        id: 'agent-3',
        name: 'After Hours Support',
        agent_type: 'after_hours',
        voice_name: 'Kore',
        is_active: true,
        current_calls: 0,
        max_concurrent_calls: 5,
        status: 'available',
        last_call_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'agent-4',
        name: 'Appointment Scheduler',
        agent_type: 'appointment_booking',
        voice_name: 'Aoede',
        is_active: false,
        current_calls: 0,
        max_concurrent_calls: 2,
        status: 'offline',
        last_call_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  }

  private static getDemoCallQueue(): any[] {
    return [
      {
        id: 'queue-1',
        phone_number: '+1 (555) 111-2222',
        customer_name: 'David Wilson',
        priority: 'high',
        wait_time_seconds: 45,
        agent_type_requested: 'sales'
      },
      {
        id: 'queue-2',
        phone_number: '+1 (555) 333-4444',
        customer_name: 'Lisa Brown',
        priority: 'normal',
        wait_time_seconds: 23,
        agent_type_requested: 'customer_service'
      },
      {
        id: 'queue-3',
        phone_number: '+1 (555) 555-6666',
        priority: 'urgent',
        wait_time_seconds: 67,
        agent_type_requested: 'support'
      }
    ]
  }

  private static getRandomCallQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const qualities = ['excellent', 'good', 'fair', 'poor'] as const
    const weights = [0.4, 0.35, 0.2, 0.05] // 40% excellent, 35% good, 20% fair, 5% poor
    const random = Math.random()
    let cumulative = 0
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i]
      if (random <= cumulative) {
        return qualities[i]
      }
    }
    
    return 'good'
  }

  // Additional helper methods
  static async getAllCallLogs(profileId: string): Promise<CallLog[]> {
    return this.getCallLogs(profileId, 1000, 0)
  }

  static async getSubscription(profileId: string): Promise<Subscription | null> {
    if (this.isDemoMode()) {
      return null
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error)
      return null
    }

    return data
  }

  static async getUsageRecords(profileId: string): Promise<UsageRecord[]> {
    if (this.isDemoMode()) {
      return []
    }

    const { data, error } = await supabase
      .from('usage_records')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching usage records:', error)
      return []
    }

    return data || []
  }

  static async createCheckoutSession(profileId: string, planId: string): Promise<string> {
    // In a real implementation, this would call Stripe API
    return `https://checkout.stripe.com/pay/cs_test_${planId}_${profileId}`
  }

  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (this.isDemoMode()) {
      return true
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (error) {
      console.error('Error cancelling subscription:', error)
      throw error
    }

    return true
  }

  static async createWebhookEndpoint(webhook: Omit<WebhookEndpoint, 'id' | 'created_at' | 'updated_at' | 'success_count' | 'failure_count'>): Promise<WebhookEndpoint> {
    if (this.isDemoMode()) {
      throw new Error('Webhook management not available in demo mode')
    }

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        ...webhook,
        success_count: 0,
        failure_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating webhook endpoint:', error)
      throw error
    }

    return data
  }

  static async updateWebhookEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    if (this.isDemoMode()) {
      throw new Error('Webhook management not available in demo mode')
    }

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating webhook endpoint:', error)
      throw error
    }

    return data
  }

  static async deleteWebhookEndpoint(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      throw new Error('Webhook management not available in demo mode')
    }

    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting webhook endpoint:', error)
      throw error
    }

    return true
  }

  static async testWebhookEndpoint(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      throw new Error('Webhook testing not available in demo mode')
    }

    // In a real implementation, this would trigger a test webhook
    console.log('Testing webhook endpoint:', id)
    return true
  }

  static async bulkAddDNCEntries(entries: Omit<DNCEntry, 'id' | 'created_at'>[]): Promise<DNCEntry[]> {
    if (this.isDemoMode()) {
      throw new Error('DNC management not available in demo mode')
    }

    const { data, error } = await supabase
      .from('dnc_lists')
      .insert(entries)
      .select()

    if (error) {
      console.error('Error bulk adding DNC entries:', error)
      throw error
    }

    return data || []
  }

  static async checkDNCStatus(phoneNumber: string, profileId: string): Promise<boolean> {
    if (this.isDemoMode()) {
      return false
    }

    const { data, error } = await supabase
      .from('dnc_lists')
      .select('id')
      .eq('profile_id', profileId)
      .eq('phone_number', phoneNumber)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking DNC status:', error)
      return false
    }

    return !!data
  }

  static async bulkCreateCampaignLeads(leads: Omit<CampaignLead, 'id' | 'created_at' | 'updated_at'>[]): Promise<CampaignLead[]> {
    if (this.isDemoMode()) {
      throw new Error('Campaign lead management not available in demo mode')
    }

    const { data, error } = await supabase
      .from('campaign_leads')
      .insert(leads)
      .select()

    if (error) {
      console.error('Error bulk creating campaign leads:', error)
      throw error
    }

    return data || []
  }

  static async createCampaignLead(lead: Omit<CampaignLead, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignLead | null> {
    if (this.isDemoMode()) {
      console.log('Demo mode: Campaign lead creation simulated')
      // Return a mock lead object instead of throwing error
      return {
        ...lead,
        id: 'demo-lead-' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as CampaignLead
    }

    const { data, error } = await supabase
      .from('campaign_leads')
      .insert(lead)
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign lead:', error)
      throw error
    }

    return data
  }

  static async updateCampaignLead(id: string, updates: Partial<CampaignLead>): Promise<CampaignLead | null> {
    if (this.isDemoMode()) {
      throw new Error('Campaign lead management not available in demo mode')
    }

    const { data, error } = await supabase
      .from('campaign_leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign lead:', error)
      throw error
    }

    return data
  }

  static async deleteCampaignLead(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      throw new Error('Campaign lead management not available in demo mode')
    }

    const { error } = await supabase
      .from('campaign_leads')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting campaign lead:', error)
      throw error
    }

    return true
  }
}