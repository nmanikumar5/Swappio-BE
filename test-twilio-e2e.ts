import dotenv from 'dotenv';
import twilio from 'twilio';
import readline from 'readline';

// Load environment variables
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function testSMSSending() {
    console.log('🔍 Twilio SMS End-to-End Test\n');
    console.log('='.repeat(50));
    console.log('Account Type: TRIAL');
    console.log('⚠️  Trial accounts can ONLY send SMS to verified numbers');
    console.log('='.repeat(50) + '\n');

    if (!accountSid || !authToken || !phoneNumber) {
        console.error('❌ Twilio credentials not configured');
        process.exit(1);
    }

    try {
        const client = twilio(accountSid, authToken);

        // Step 1: List verified phone numbers
        console.log('📋 Step 1: Fetching verified phone numbers...\n');

        const outgoingCallerIds = await client.outgoingCallerIds.list();

        console.log('Verified Caller IDs:');
        if (outgoingCallerIds.length > 0) {
            outgoingCallerIds.forEach((caller, idx) => {
                console.log(`  ${idx + 1}. ${caller.phoneNumber} (${caller.friendlyName})`);
            });
        } else {
            console.log('  None found - You need to verify numbers for trial account');
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Step 2: Ask user for test number
        console.log('📱 Step 2: Send Test SMS\n');
        console.log('For TRIAL accounts, the recipient must be:');
        console.log('  1. A verified phone number in your Twilio account, OR');
        console.log('  2. The phone number you used to sign up for Twilio');
        console.log('');

        const testNumber = await question('Enter verified phone number to test (e.g., +919876543210) or press Enter to skip: ');

        if (!testNumber.trim()) {
            console.log('\n⏭️  Skipping SMS send test');
            rl.close();
            return;
        }

        // Validate format
        if (!/^\+[1-9]\d{9,14}$/.test(testNumber.trim())) {
            console.log('\n❌ Invalid phone number format. Use E.164 format: +919876543210');
            rl.close();
            return;
        }

        // Step 3: Send test SMS
        console.log('\n📤 Sending test SMS...');
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const message = await client.messages.create({
            body: `Your Swappio verification code is: ${verificationCode}. Valid for 10 minutes.`,
            from: phoneNumber,
            to: testNumber.trim()
        });

        console.log('\n✅ SMS sent successfully!');
        console.log('   Message SID:', message.sid);
        console.log('   Status:', message.status);
        console.log('   To:', message.to);
        console.log('   From:', message.from);
        console.log('   Verification Code:', verificationCode);

        console.log('\n' + '='.repeat(50));
        console.log('✅ E2E Test Completed Successfully!');
        console.log('='.repeat(50) + '\n');

    } catch (error: any) {
        console.error('\n❌ Test failed:\n');
        console.error('Error:', error.message);
        if (error.code) {
            console.error('Code:', error.code);

            // Provide helpful error messages
            if (error.code === 21608) {
                console.error('\n💡 Solution: This is a TRIAL account error.');
                console.error('   The recipient number must be verified in your Twilio account.');
                console.error('   To verify a number:');
                console.error('   1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
                console.error('   2. Click "Add a new number"');
                console.error('   3. Verify the phone number you want to test with');
            } else if (error.code === 21211) {
                console.error('\n💡 Solution: Invalid phone number format.');
                console.error('   Use E.164 format: +[country code][number]');
                console.error('   Example: +919876543210');
            }
        }
        if (error.moreInfo) console.error('More Info:', error.moreInfo);
    }

    rl.close();
}

testSMSSending();
