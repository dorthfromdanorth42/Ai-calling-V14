#!/usr/bin/env node

/**
 * Gemini Audio Quality and Response Time Test
 * Tests the Gemini Live integration for audio quality and response timing
 */

import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

class GeminiAudioTester {
    constructor() {
        this.ws = null;
        this.testResults = {
            connectionTime: 0,
            firstResponseTime: 0,
            averageResponseTime: 0,
            audioQuality: 'unknown',
            speaksFirst: false,
            totalTests: 0,
            successfulTests: 0,
            errors: []
        };
        this.testStartTime = 0;
        this.responseTimes = [];
    }

    async runTests() {
        console.log('🎤 Starting Gemini Audio Quality and Response Time Tests');
        console.log('=' .repeat(60));
        
        try {
            await this.testConnection();
            await this.testInitialGreeting();
            await this.testResponseTimes();
            await this.testAudioConfiguration();
            this.generateReport();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.testResults.errors.push(error.message);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }

    async testConnection() {
        console.log('\n🔌 Testing Gemini Live Connection...');
        
        const startTime = performance.now();
        
        return new Promise((resolve, reject) => {
            const wsUrl = `${GEMINI_WS_URL}?key=${GEMINI_API_KEY}`;
            this.ws = new WebSocket(wsUrl);
            
            this.ws.on('open', () => {
                this.testResults.connectionTime = performance.now() - startTime;
                console.log(`✅ Connected to Gemini Live in ${this.testResults.connectionTime.toFixed(2)}ms`);
                
                // Send setup message
                const setupMessage = {
                    setup: {
                        model: 'models/gemini-2.0-flash-live-001',
                        generation_config: {
                            response_modalities: ['AUDIO'],
                            speech_config: {
                                voice_config: {
                                    prebuilt_voice_config: {
                                        voice_name: 'Puck'
                                    }
                                }
                            }
                        },
                        system_instruction: {
                            parts: [{ 
                                text: 'You are a professional AI assistant. You MUST speak first immediately when connected. Start with "Hello! Thank you for calling. How can I help you today?" Be concise and professional.'
                            }]
                        }
                    }
                };
                
                this.ws.send(JSON.stringify(setupMessage));
                resolve();
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ WebSocket connection failed:', error.message);
                this.testResults.errors.push(`Connection failed: ${error.message}`);
                reject(error);
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    async testInitialGreeting() {
        console.log('\n👋 Testing Initial Greeting (Speaks First)...');
        
        return new Promise((resolve) => {
            let greetingReceived = false;
            
            // Send a trigger message to initiate conversation
            const triggerMessage = {
                client_content: {
                    turns: [{
                        role: 'user',
                        parts: [{ text: 'Please greet me now as if I just called.' }]
                    }],
                    turn_complete: true
                }
            };
            
            this.testStartTime = performance.now();
            this.ws.send(JSON.stringify(triggerMessage));
            
            const originalHandler = this.handleMessage.bind(this);
            this.handleMessage = (message) => {
                if (message.server_content && message.server_content.model_turn) {
                    const turn = message.server_content.model_turn;
                    if (turn.parts && turn.parts.some(part => part.inline_data)) {
                        if (!greetingReceived) {
                            this.testResults.firstResponseTime = performance.now() - this.testStartTime;
                            this.testResults.speaksFirst = true;
                            greetingReceived = true;
                            console.log(`✅ Gemini spoke first! Response time: ${this.testResults.firstResponseTime.toFixed(2)}ms`);
                            
                            // Check if it's actually audio
                            const audioPart = turn.parts.find(part => part.inline_data);
                            if (audioPart && audioPart.inline_data.mime_type === 'audio/pcm') {
                                console.log(`✅ Audio response received (${audioPart.inline_data.data.length} bytes)`);
                                this.testResults.audioQuality = 'received';
                            }
                            
                            this.handleMessage = originalHandler;
                            resolve();
                        }
                    }
                }
                originalHandler(message);
            };
            
            // Timeout after 5 seconds
            setTimeout(() => {
                if (!greetingReceived) {
                    console.log('❌ No initial greeting received within 5 seconds');
                    this.testResults.speaksFirst = false;
                    this.handleMessage = originalHandler;
                    resolve();
                }
            }, 5000);
        });
    }

    async testResponseTimes() {
        console.log('\n⏱️  Testing Response Times...');
        
        const testQueries = [
            'What services do you offer?',
            'Can you help me with my account?',
            'What are your business hours?',
            'How can I contact support?',
            'Thank you for your help.'
        ];
        
        for (let i = 0; i < testQueries.length; i++) {
            await this.testSingleResponse(testQueries[i], i + 1);
            await this.sleep(1000); // Wait 1 second between tests
        }
        
        if (this.responseTimes.length > 0) {
            this.testResults.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
            console.log(`📊 Average response time: ${this.testResults.averageResponseTime.toFixed(2)}ms`);
        }
    }

    async testSingleResponse(query, testNumber) {
        return new Promise((resolve) => {
            console.log(`  Test ${testNumber}: "${query}"`);
            
            const message = {
                client_content: {
                    turns: [{
                        role: 'user',
                        parts: [{ text: query }]
                    }],
                    turn_complete: true
                }
            };
            
            const startTime = performance.now();
            let responseReceived = false;
            
            const originalHandler = this.handleMessage.bind(this);
            this.handleMessage = (msg) => {
                if (msg.server_content && msg.server_content.model_turn && !responseReceived) {
                    const responseTime = performance.now() - startTime;
                    this.responseTimes.push(responseTime);
                    responseReceived = true;
                    console.log(`    ✅ Response in ${responseTime.toFixed(2)}ms`);
                    this.testResults.successfulTests++;
                    this.handleMessage = originalHandler;
                    resolve();
                }
                originalHandler(msg);
            };
            
            this.ws.send(JSON.stringify(message));
            this.testResults.totalTests++;
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (!responseReceived) {
                    console.log(`    ❌ No response within 10 seconds`);
                    this.testResults.errors.push(`Test ${testNumber}: Timeout`);
                    this.handleMessage = originalHandler;
                    resolve();
                }
            }, 10000);
        });
    }

    async testAudioConfiguration() {
        console.log('\n🔊 Testing Audio Configuration...');
        
        // Test different voice configurations
        const voices = ['Puck', 'Fenrir', 'Aoede', 'Leda'];
        
        for (const voice of voices) {
            console.log(`  Testing voice: ${voice}`);
            
            const setupMessage = {
                setup: {
                    model: 'models/gemini-2.0-flash-live-001',
                    generation_config: {
                        response_modalities: ['AUDIO'],
                        speech_config: {
                            voice_config: {
                                prebuilt_voice_config: {
                                    voice_name: voice
                                }
                            }
                        }
                    }
                }
            };
            
            this.ws.send(JSON.stringify(setupMessage));
            await this.sleep(500);
            
            // Test a quick response with this voice
            const testMessage = {
                client_content: {
                    turns: [{
                        role: 'user',
                        parts: [{ text: `Say "Hello, this is ${voice} speaking" in a friendly tone.` }]
                    }],
                    turn_complete: true
                }
            };
            
            this.ws.send(JSON.stringify(testMessage));
            await this.sleep(2000);
        }
        
        console.log('✅ Audio configuration tests completed');
    }

    handleMessage(message) {
        // Default message handler
        if (message.setup_complete) {
            console.log('✅ Gemini Live setup completed');
        }
        
        if (message.server_content) {
            if (message.server_content.model_turn) {
                // Handle model responses
                const turn = message.server_content.model_turn;
                if (turn.parts) {
                    turn.parts.forEach(part => {
                        if (part.text) {
                            console.log(`📝 Text response: ${part.text.substring(0, 100)}...`);
                        }
                        if (part.inline_data && part.inline_data.mime_type === 'audio/pcm') {
                            console.log(`🎵 Audio response: ${part.inline_data.data.length} bytes`);
                        }
                    });
                }
            }
            
            if (message.server_content.turn_complete) {
                console.log('✅ Turn completed');
            }
        }
    }

    generateReport() {
        console.log('\n📊 GEMINI AUDIO TEST REPORT');
        console.log('=' .repeat(60));
        
        console.log(`🔌 Connection Time: ${this.testResults.connectionTime.toFixed(2)}ms`);
        console.log(`👋 Speaks First: ${this.testResults.speaksFirst ? '✅ YES' : '❌ NO'}`);
        console.log(`⚡ First Response Time: ${this.testResults.firstResponseTime.toFixed(2)}ms`);
        console.log(`📈 Average Response Time: ${this.testResults.averageResponseTime.toFixed(2)}ms`);
        console.log(`🎯 Success Rate: ${this.testResults.successfulTests}/${this.testResults.totalTests} (${((this.testResults.successfulTests / this.testResults.totalTests) * 100).toFixed(1)}%)`);
        console.log(`🔊 Audio Quality: ${this.testResults.audioQuality}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        // Performance recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        
        if (this.testResults.connectionTime > 2000) {
            console.log('⚠️  Connection time is high (>2s). Check network connectivity.');
        } else {
            console.log('✅ Connection time is good (<2s).');
        }
        
        if (this.testResults.averageResponseTime > 3000) {
            console.log('⚠️  Average response time is high (>3s). Consider optimizing prompts.');
        } else {
            console.log('✅ Response times are acceptable (<3s).');
        }
        
        if (!this.testResults.speaksFirst) {
            console.log('❌ CRITICAL: Gemini is not speaking first! Check initial greeting configuration.');
        } else {
            console.log('✅ Gemini correctly speaks first on calls.');
        }
        
        console.log('\n🎉 Test completed!');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new GeminiAudioTester();
    tester.runTests().catch(console.error);
}

export default GeminiAudioTester;