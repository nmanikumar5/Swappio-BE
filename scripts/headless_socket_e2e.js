/* Headless Socket.io Two-Client E2E Test
 * Tests bidirectional messaging between two socket clients
 * Usage: node scripts/headless_socket_e2e.js
 */

const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API = process.env.API_URL || 'http://localhost:5001/api';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5001';

async function ensureUser(email, password, name) {
    // Try login first
    let resp = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (resp.ok) {
        const body = await resp.json();
        return { token: body.data.token, userId: body.data.user.id };
    }

    // Register if login failed
    resp = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });
    const body = await resp.json();
    return { token: body.data.token, userId: body.data.user.id };
}

(async () => {
    console.log('Starting headless socket e2e test');

    try {
        // Create/login two users
        const userA = await ensureUser('socket-test-a@example.com', 'password123', 'Socket Test A');
        const userB = await ensureUser('socket-test-b@example.com', 'password123', 'Socket Test B');

        console.log('tokenA len=', userA.token?.length || 0, ' tokenB len=', userB.token?.length || 0);

        // Create socket clients
        const socketA = io(SOCKET_URL, {
            auth: { token: userA.token },
            transports: ['websocket']
        });

        const socketB = io(SOCKET_URL, {
            auth: { token: userB.token },
            transports: ['websocket']
        });

        // Track connection status
        let aConnected = false;
        let bConnected = false;

        socketA.on('connect', () => {
            console.log('socketA connected', socketA.id);
            aConnected = true;
        });

        socketB.on('connect', () => {
            console.log('socketB connected', socketB.id);
            bConnected = true;
        });

        // Listen for events
        socketA.on('message_sent', (msg) => {
            console.log('socketA message_sent', msg?._id || msg?.id || msg);
        });

        socketA.on('message_delivered', (data) => {
            console.log('socketA message_delivered', data);
        });

        socketA.on('message_error', (err) => {
            console.log('socketA message_error', err);
        });

        socketB.on('receive_message', (msg) => {
            const id = msg?._id || msg?.id;
            const text = msg?.text;
            console.log('socketB receive_message', id, ' — text=', text);
        });

        // Wait for both to connect
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!aConnected || !bConnected) {
            console.error('❌ One or both sockets failed to connect');
            process.exit(1);
        }

        console.log('Both connected — sending message from A to B');

        // Send message from A to B
        socketA.emit('send_message', {
            receiverId: userB.userId,
            text: 'Hello from A to B via sockets!',
        });

        // Wait for message to be received
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('Done — closing sockets');
        socketA.close();
        socketB.close();

        process.exit(0);

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
})();
