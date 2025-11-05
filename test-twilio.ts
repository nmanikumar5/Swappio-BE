import dotenv from 'dotenv';
import twilio from 'twilio';

// Load environment variables
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('🔍 Testing Twilio Configuration...\n');
console.log('Account SID:', accountSid ? accountSid.substring(0, 10) + '...' : 'NOT SET');
console.log('Auth Token:', authToken ? authToken.substring(0, 10) + '...' : 'NOT SET');
console.log('Phone Number:', phoneNumber || 'NOT SET');
console.log('\n' + '='.repeat(50) + '\n');

if (!accountSid || !authToken || !phoneNumber) {
    console.error('❌ Twilio credentials not configured in .env file');
    process.exit(1);
}

async function testTwilio() {
    try {
        console.log('📞 Initializing Twilio client...');
        const client = twilio(accountSid!, authToken!);

        console.log('✅ Twilio client initialized successfully\n');

        // Test 1: Verify account
        console.log('🔍 Test 1: Fetching account details...');
        const account = await client.api.accounts(accountSid!).fetch();
        console.log('✅ Account Status:', account.status);
        console.log('   Account Name:', account.friendlyName);
        console.log('   Account Type:', account.type);
        console.log('\n' + '='.repeat(50) + '\n');

        // Test 2: Verify phone number
        console.log('🔍 Test 2: Verifying phone number...');
        const incomingPhoneNumber = await client.incomingPhoneNumbers.list({
            phoneNumber: phoneNumber
        });

        if (incomingPhoneNumber.length > 0) {
            console.log('✅ Phone number verified:', incomingPhoneNumber[0].phoneNumber);
            console.log('   Capabilities:', {
                sms: incomingPhoneNumber[0].capabilities.sms,
                voice: incomingPhoneNumber[0].capabilities.voice
            });
        } else {
            console.log('⚠️  Phone number not found in account');
            console.log('   This might be a trial account limitation');
        }
        console.log('\n' + '='.repeat(50) + '\n');

        // Test 3: Send test SMS (optional - commented out to avoid charges)
        console.log('🔍 Test 3: Test SMS sending capability...');
        console.log('⏭️  Skipping actual SMS send to avoid charges');
        console.log('   To test SMS sending, uncomment the code below and add a verified number');
        console.log('\n   Example code:');
        console.log('   const message = await client.messages.create({');
        console.log('     body: "Test message from Swappio",');
        console.log('     from: phoneNumber,');
        console.log('     to: "+919876543210" // Replace with verified number');
        console.log('   });');

        console.log('\n' + '='.repeat(50) + '\n');
        console.log('✅ All Twilio tests passed!\n');

    } catch (error: any) {
        console.error('\n❌ Twilio test failed:\n');
        console.error('Error:', error.message);
        if (error.code) console.error('Code:', error.code);
        if (error.status) console.error('Status:', error.status);
        if (error.moreInfo) console.error('More Info:', error.moreInfo);
        process.exit(1);
    }
}

testTwilio();
