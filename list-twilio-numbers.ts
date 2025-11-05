import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

async function listTwilioNumbers() {
    console.log('📞 Fetching Twilio Phone Numbers...\n');

    if (!accountSid || !authToken) {
        console.error('❌ Twilio credentials not configured');
        process.exit(1);
    }

    try {
        const client = twilio(accountSid, authToken);

        // Get all phone numbers
        console.log('1️⃣  Incoming Phone Numbers (SMS-capable numbers you own):');
        const incomingNumbers = await client.incomingPhoneNumbers.list();

        if (incomingNumbers.length > 0) {
            incomingNumbers.forEach((number, idx) => {
                console.log(`   ${idx + 1}. ${number.phoneNumber}`);
                console.log(`      Name: ${number.friendlyName}`);
                console.log(`      SMS: ${number.capabilities.sms ? '✅' : '❌'}`);
                console.log(`      Voice: ${number.capabilities.voice ? '✅' : '❌'}`);
                console.log('');
            });
        } else {
            console.log('   ⚠️  No phone numbers found!');
            console.log('   For trial accounts, you need to request a free trial phone number.');
            console.log('   Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/search');
            console.log('');
        }

        console.log('2️⃣  Verified Caller IDs (numbers you can send FROM in trial mode):');
        const callerIds = await client.outgoingCallerIds.list();

        if (callerIds.length > 0) {
            callerIds.forEach((caller, idx) => {
                console.log(`   ${idx + 1}. ${caller.phoneNumber} (${caller.friendlyName})`);
            });
        } else {
            console.log('   ⚠️  No verified caller IDs');
        }

        console.log('\n3️⃣  Messaging Services:');
        const services = await client.messaging.v1.services.list();

        if (services.length > 0) {
            services.forEach((service, idx) => {
                console.log(`   ${idx + 1}. ${service.friendlyName} (SID: ${service.sid})`);
            });
        } else {
            console.log('   None found');
        }

        console.log('\n' + '='.repeat(60));
        console.log('💡 Next Steps:');
        console.log('='.repeat(60));

        if (incomingNumbers.length === 0) {
            console.log('\n⚠️  You need to get a phone number from Twilio:');
            console.log('');
            console.log('For TRIAL accounts:');
            console.log('  1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/search');
            console.log('  2. Select India (+91) as country');
            console.log('  3. Check "SMS" capability');
            console.log('  4. Search for available numbers');
            console.log('  5. Get a FREE trial number');
            console.log('');
            console.log('Then update your .env file:');
            console.log('  TWILIO_PHONE_NUMBER=+91XXXXXXXXXX  (the number you got from Twilio)');
        } else {
            console.log('\n✅ You have Twilio phone numbers configured!');
            console.log(`   Update .env with: TWILIO_PHONE_NUMBER=${incomingNumbers[0].phoneNumber}`);
        }

    } catch (error: any) {
        console.error('\n❌ Error:\n');
        console.error('Error:', error.message);
        if (error.code) console.error('Code:', error.code);
        process.exit(1);
    }
}

listTwilioNumbers();
