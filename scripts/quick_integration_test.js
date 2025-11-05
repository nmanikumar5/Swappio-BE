#!/usr/bin/env node
/* Quick Integration Test - Sends 3 messages and verifies receipt */

const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';

async function ensureUser(email, password, name) {
    try {
        let resp = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (resp.ok) {
            const body = await resp.json();
            return { token: body.data.token, userId: body.data.user.id };
        }
        resp = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        const body = await resp.json();
        return { token: body.data.token, userId: body.data.user.id };
    } catch (err) {
        console.error('ensureUser failed:', err.message);
        throw err;
    }
}

(async () => {
    console.log('=== Quick Integration Test ===\n');

    try {
        // Create/login users
        console.log('1. Creating/logging in test users...');
        const userA = await ensureUser('socket-test-a@example.com', 'password123', 'User A');
        const userB = await ensureUser('socket-test-b@example.com', 'password123', 'User B');
        console.log(`   ✅ User A: ${userA.userId}`);
        console.log(`   ✅ User B: ${userB.userId}\n`);

        // Connect sockets
        console.log('2. Connecting socket clients...');
        const socketA = io(SOCKET_URL, { auth: { token: userA.token }, transports: ['websocket'] });
        const socketB = io(SOCKET_URL, { auth: { token: userB.token }, transports: ['websocket'] });

        let receivedCount = 0;
        let sentCount = 0;

        socketA.on('connect', () => console.log(`   ✅ Socket A connected: ${socketA.id}`));
        socketB.on('connect', () => console.log(`   ✅ Socket B connected: ${socketB.id}`));

        socketA.on('message_sent', (msg) => {
            sentCount++;
            console.log(`   📤 A: message_sent #${sentCount}`);
        });

        socketA.on('message_delivered', (data) => {
            console.log(`   ✅ A: message_delivered (${data.messageId})`);
        });

        socketB.on('receive_message', (msg) => {
            receivedCount++;
            console.log(`   📨 B: receive_message #${receivedCount} - "${msg.text}"`);
        });

        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Send 3 messages
        console.log('\n3. Sending 3 messages from A to B...');
        for (let i = 1; i <= 3; i++) {
            const text = `Test message ${i}`;
            console.log(`   Sending: "${text}"`);
            socketA.emit('send_message', { receiverId: userB.userId, text });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Wait for delivery
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Results
        console.log('\n=== Results ===');
        console.log(`Messages sent (A): ${sentCount}/3`);
        console.log(`Messages received (B): ${receivedCount}/3`);

        if (receivedCount === 3 && sentCount === 3) {
            console.log('\n✅ TEST PASSED - All messages sent and received!\n');
        } else {
            console.log('\n❌ TEST FAILED - Message count mismatch\n');
        }

        // Cleanup
        socketA.close();
        socketB.close();
        process.exit(receivedCount === 3 && sentCount === 3 ? 0 : 1);

    } catch (err) {
        console.error('\n❌ Test failed:', err);
        process.exit(1);
    }
})();
