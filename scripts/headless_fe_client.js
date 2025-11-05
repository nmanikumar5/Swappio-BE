/* Headless FE-like Client
 * Mimics the FE socket connection flow to verify messages are received
 * Usage: node scripts/headless_fe_client.js [user-email]
 */

const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API = process.env.API_URL || 'http://localhost:5001/api';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5001';
const userEmail = process.argv[2] || 'socket-test-b@example.com';
const password = 'password123';

async function ensureUser(email, password, name) {
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
}

(async () => {
    try {
        console.log('Starting FE-like client for', userEmail);

        const user = await ensureUser(userEmail, password, 'FE-like Client');
        console.log('Logged in as', userEmail, 'userId:', user.userId);

        // Mimic FE socket creation exactly
        const socket = io(SOCKET_URL, {
            auth: { token: user.token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        let messageCount = 0;

        socket.on('connect', () => {
            console.log('✅ FE-like client connected, socket.id:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ FE-like client disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.error('❌ connection error:', err.message);
        });

        socket.on('receive_message', (msg) => {
            messageCount++;
            console.log(`📨 [${messageCount}] receive_message:`, {
                id: msg?._id || msg?.id,
                sender: msg?.sender?.name || msg?.sender,
                text: msg?.text,
                createdAt: msg?.createdAt,
            });
        });

        socket.on('message_sent', (msg) => {
            console.log('✉️ message_sent:', msg?._id || msg?.id);
        });

        socket.on('message_delivered', (data) => {
            console.log('✅ message_delivered:', data);
        });

        socket.on('messages_read', (data) => {
            console.log('👁️ messages_read:', data);
        });

        socket.on('user_typing', (data) => {
            console.log('⌨️ user_typing:', data);
        });

        socket.on('user_stop_typing', (data) => {
            console.log('⌨️ user_stop_typing:', data);
        });

        // Keep alive for 60 seconds
        console.log('Listening for 60 seconds... (Ctrl+C to exit early)');
        setTimeout(() => {
            console.log(`\n--- Summary ---`);
            console.log(`Total messages received: ${messageCount}`);
            socket.close();
            process.exit(0);
        }, 60000);

    } catch (err) {
        console.error('FE-like client failed:', err);
        process.exit(1);
    }
})();
