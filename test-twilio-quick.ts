import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

async function sendTestSMS() {
    console.log('🔍 Twilio SMS Quick Test\n');

    if (!accountSid || !authToken || !phoneNumber) {
        console.error('❌ Twilio credentials not configured');
        process.exit(1);
    }

    try {
        const client = twilio(accountSid, authToken);

        // Use the verified number from the test
        const testNumber = '+917995546854'; // Verified number (different from sender)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        console.log('📤 Sending test SMS to verified number:', testNumber);
        console.log('📝 Verification Code:', verificationCode);
        console.log('');

        const message = await client.messages.create({
            body: `Your Swappio verification code is: ${verificationCode}. Valid for 10 minutes. This is a test message.`,
            from: phoneNumber,
            to: testNumber
        });

        console.log('✅ SMS sent successfully!');
        console.log('   Message SID:', message.sid);
        console.log('   Status:', message.status);
        console.log('   To:', message.to);
        console.log('   From:', message.from);
        console.log('   Price:', message.price, message.priceUnit);
        console.log('');
        console.log('🎉 Twilio integration is working correctly!');
        console.log('');
        console.log('⚠️  Note: For trial accounts, you can only send to verified numbers.');
        console.log('   To send to any number, upgrade your Twilio account.');

    } catch (error: any) {
        console.error('\n❌ Test failed:\n');
        console.error('Error:', error.message);
        if (error.code) console.error('Code:', error.code);
        if (error.moreInfo) console.error('More Info:', error.moreInfo);
        process.exit(1);
    }
}

sendTestSMS();
