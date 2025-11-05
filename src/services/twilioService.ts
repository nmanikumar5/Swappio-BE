import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

// Initialize Twilio client only if credentials are provided
if (accountSid && authToken) {
    try {
        twilioClient = twilio(accountSid, authToken);
    } catch (error) {
        console.error('Failed to initialize Twilio client:', error);
    }
}

export class TwilioService {
    /**
     * Send SMS verification code
     */
    static async sendVerificationCode(to: string, code: string): Promise<boolean> {

        console.log('Sending verification code via Twilio...', code);

        if (!twilioClient || !phoneNumber) {
            console.warn('Twilio not configured. Would send code:', code, 'to:', to);
            // In development, log the code instead of sending SMS
            if (process.env.NODE_ENV === 'development') {
                console.log(`📱 SMS Verification Code for ${to}: ${code}`);
                return true;
            }
            throw new Error('Twilio service not configured');
        }

        try {
            const message = await twilioClient.messages.create({
                body: `Your Swappio verification code is: ${code}. Valid for 10 minutes.`,
                from: phoneNumber,
                to: to,
            });

            console.log('SMS sent successfully:', message.sid);
            return true;
        } catch (error) {
            console.error('Failed to send SMS:', error);
            throw new Error('Failed to send verification code');
        }
    }

    /**
     * Generate a random 6-digit verification code
     */
    static generateVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Validate phone number format (basic validation)
     */
    static validatePhoneNumber(phone: string): boolean {
        // Basic validation - should start with + and contain 10-15 digits
        const phoneRegex = /^\+[1-9]\d{9,14}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Format phone number to E.164 format
     */
    static formatPhoneNumber(phone: string): string {
        // Remove all non-digit characters except +
        let formatted = phone.replace(/[^\d+]/g, '');

        // If doesn't start with +, assume it's an Indian number and add +91
        if (!formatted.startsWith('+')) {
            // Remove leading 0 if present
            if (formatted.startsWith('0')) {
                formatted = formatted.substring(1);
            }
            formatted = '+91' + formatted;
        }

        return formatted;
    }
}
