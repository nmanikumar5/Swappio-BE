/* Send test messages to browser user
 * Usage: node scripts/send_to_browser_user.js <recipient-userId>
 */

const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';

async function login(email, password) {
    const resp = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const body = await resp.json();
    return { token: body.data.token, userId: body.data.user.id };
}

(async () => {
    try {
        const recipientId = process.argv[2] || '68fe0ce8698059a526a89c3a';

        // Login as test user A
        const userA = await login('socket-test-a@example.com', 'password123');

        console.log('✅ Logged in as socket-test-a');
        console.log('📤 Sending 5 messages to user:', recipientId);

        const socket = io(SOCKET_URL, {
            auth: { token: userA.token },
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('✅ Sender connected:', socket.id);
        });

        socket.on('message_sent', (msg) => {
            console.log('📨 Message sent:', msg?._id || msg?.id);
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Send 5 messages
        for (let i = 1; i <= 5; i++) {
            const text = `🎉 Real-time test message ${i}`;
            console.log(`\n📤 Sending: "${text}"`);
            socket.emit('send_message', { receiverId: recipientId, text });
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n✅ Done! Check your browser console for [SOCKET] receive_message logs');
        socket.close();
        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
})();
