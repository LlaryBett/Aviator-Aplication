const WebSocket = require('ws');

// Create test clients
const client1 = new WebSocket('ws://localhost:5000');
const client2 = new WebSocket('ws://localhost:5000');

// Test messages
const testMessages = [
    { text: "Hello from Client 1!", username: "TestUser1" },
    { text: "Hi there! From Client 2", username: "TestUser2" },
    { text: "How's the game going?", username: "TestUser1" }
];

function formatMessage(data) {
    try {
        const parsed = JSON.parse(data);
        console.log('\n=== Message Received ===');
        console.log('Type:', parsed.type);
        console.log('Content:', JSON.stringify(parsed.messages || parsed.message, null, 2));
        console.log('Timestamp:', new Date().toLocaleTimeString());
        console.log('=====================\n');
    } catch (err) {
        console.error('Error parsing message:', err);
    }
}

// Client 1 setup
client1.on('open', () => {
    console.log('Client 1 connected');
    // Wait for chat history first
    setTimeout(() => {
        client1.send(JSON.stringify({
            type: 'chat_message',
            message: testMessages[0]
        }));
    }, 500);
});

client1.on('message', (data) => formatMessage(data));
client1.on('error', console.error);

// Client 2 setup
client2.on('open', () => {
    console.log('Client 2 connected');
    setTimeout(() => {
        client2.send(JSON.stringify({
            type: 'chat_message',
            message: testMessages[1]
        }));
    }, 1000);
});

client2.on('message', (data) => formatMessage(data));
client2.on('error', console.error);

// Cleanup after tests
process.on('SIGINT', () => {
    console.log('\nClosing test clients...');
    client1.close();
    client2.close();
    process.exit();
});

// Auto-close after 5 seconds
setTimeout(() => {
    console.log('\nTest completed, closing connections...');
    client1.close();
    client2.close();
    process.exit();
}, 5000);
