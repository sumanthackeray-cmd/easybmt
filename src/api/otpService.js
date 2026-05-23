import { supabase } from './supabase';

/**
 * OTP Service for authentication
 * Handles email OTP verification for registration and password reset
 */

const OTP_VALIDITY_MINUTES = 10; // OTP valid for 10 minutes
const MAX_OTP_ATTEMPTS = 5; // Max attempts before rate limit
const RATE_LIMIT_MINUTES = 15; // Rate limit window

/**
 * Send OTP to email for verification
 * @param {string} email - User email address
 * @param {string} type - 'signup' or 'reset_password'
 * @returns {Promise<{success: boolean, message: string, error?: string}>}
 */
export const sendOTP = async (email, type = 'signup') => {
  try {
    console.log('[v0] Sending OTP to:', email, 'Type:', type);
    
    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return {
        success: false,
        error: 'Invalid email address'
      };
    }

    // Validate type
    if (!['signup', 'reset_password'].includes(type)) {
      return {
        success: false,
        error: 'Invalid OTP type'
      };
    }

    // Check rate limiting
    const { data: recentOTPs, error: checkError } = await supabase
      .from('otp_logs')
      .select('id')
      .eq('email', email.toLowerCase())
      .gte('created_at', new Date(Date.now() - RATE_LIMIT_MINUTES * 60000).toISOString())
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (recentOTPs && recentOTPs.length >= MAX_OTP_ATTEMPTS) {
      return {
        success: false,
        error: `Too many OTP requests. Please try again in ${RATE_LIMIT_MINUTES} minutes.`
      };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60000);

    // Store OTP in database
    const { data: otpData, error: insertError } = await supabase
      .from('otp_logs')
      .insert({
        email: email.toLowerCase(),
        otp: otp,
        type: type,
        expires_at: expiresAt.toISOString(),
        is_verified: false,
        attempts: 0
      })
      .select();

    if (insertError) {
      console.error('[v0] OTP insertion error:', insertError);
      throw insertError;
    }

    // Send email via Supabase email service or your email provider
    const { error: emailError } = await sendOTPEmail(email, otp, type);

    if (emailError) {
      // Delete OTP record if email fails
      await supabase
        .from('otp_logs')
        .delete()
        .eq('id', otpData[0].id);
      
      throw emailError;
    }

    console.log('[v0] OTP sent successfully to:', email);
    
    return {
      success: true,
      message: `OTP sent to ${email}. Valid for ${OTP_VALIDITY_MINUTES} minutes.`,
      otpId: otpData[0].id
    };
  } catch (error) {
    console.error('[v0] Send OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send OTP'
    };
  }
};

/**
 * Verify OTP entered by user
 * @param {string} email - User email
 * @param {string} otp - OTP entered by user
 * @param {string} type - 'signup' or 'reset_password'
 * @returns {Promise<{success: boolean, message: string, error?: string}>}
 */
export const verifyOTP = async (email, otp, type = 'signup') => {
  try {
    console.log('[v0] Verifying OTP for:', email);

    if (!email || !otp) {
      return {
        success: false,
        error: 'Email and OTP are required'
      };
    }

    if (otp.length !== 6 || isNaN(otp)) {
      return {
        success: false,
        error: 'Invalid OTP format'
      };
    }

    // Get the latest OTP for this email
    const { data: otpRecords, error: queryError } = await supabase
      .from('otp_logs')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('type', type)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError) {
      throw queryError;
    }

    if (!otpRecords || otpRecords.length === 0) {
      return {
        success: false,
        error: 'No OTP found. Please request a new OTP.'
      };
    }

    const otpRecord = otpRecords[0];

    // Check if OTP expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return {
        success: false,
        error: 'OTP has expired. Please request a new OTP.'
      };
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      return {
        success: false,
        error: 'Maximum OTP verification attempts exceeded. Please request a new OTP.'
      };
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await supabase
        .from('otp_logs')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = MAX_OTP_ATTEMPTS - otpRecord.attempts - 1;
      return {
        success: false,
        error: `Invalid OTP. ${remainingAttempts} attempts remaining.`
      };
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_logs')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      throw updateError;
    }

    console.log('[v0] OTP verified successfully for:', email);
    
    return {
      success: true,
      message: 'OTP verified successfully',
      otpId: otpRecord.id
    };
  } catch (error) {
    console.error('[v0] Verify OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify OTP'
    };
  }
};

/**
 * Send OTP email
 * Integrates with email service (SendGrid, Mailgun, or Supabase email)
 */
const sendOTPEmail = async (email, otp, type) => {
  try {
    const subject = type === 'signup' 
      ? 'EasyBMT - Verify Your Email' 
      : 'EasyBMT - Reset Your Password';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f5f5f5; margin-top: 20px; border-radius: 8px; }
            .otp-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>EasyBMT</h1>
              <p>${subject}</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>${type === 'signup' 
                ? 'Thank you for signing up with EasyBMT. Please verify your email address using the code below:' 
                : 'You requested a password reset. Use the code below to reset your password:'}</p>
              <div class="otp-box">
                <p>Your verification code is:</p>
                <div class="otp-code">${otp}</div>
                <p>This code is valid for 10 minutes</p>
              </div>
              <p>If you didn't request this, please ignore this email.</p>
              <p>Best regards,<br>The EasyBMT Team</p>
            </div>
            <div class="footer">
              <p>© 2026 EasyBMT. All rights reserved.</p>
              <p>easybmt.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Use Supabase email or your email service
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: subject,
        html: htmlContent,
        otp: otp
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return { error: null };
  } catch (error) {
    console.error('[v0] Email sending error:', error);
    return { error: error };
  }
};

/**
 * Resend OTP
 */
export const resendOTP = async (email, type = 'signup') => {
  try {
    // Delete old unverified OTPs
    await supabase
      .from('otp_logs')
      .delete()
      .eq('email', email.toLowerCase())
      .eq('type', type)
      .eq('is_verified', false);

    // Send new OTP
    return await sendOTP(email, type);
  } catch (error) {
    console.error('[v0] Resend OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to resend OTP'
    };
  }
};

/**
 * Check if email is verified
 */
export const isEmailVerified = async (email, type = 'signup') => {
  try {
    const { data, error } = await supabase
      .from('otp_logs')
      .select('is_verified')
      .eq('email', email.toLowerCase())
      .eq('type', type)
      .eq('is_verified', true)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('[v0] Check email verified error:', error);
    return false;
  }
};

/**
 * Cleanup expired OTPs (run periodically)
 */
export const cleanupExpiredOTPs = async () => {
  try {
    const { error } = await supabase
      .from('otp_logs')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    console.log('[v0] Expired OTPs cleaned up');
  } catch (error) {
    console.error('[v0] Cleanup error:', error);
  }
};
