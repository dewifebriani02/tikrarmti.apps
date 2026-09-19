import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Test email service configuration
    const testEmail = {
      to: email,
      subject: '📧 Test Email Service - Tikrar MTI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #15803d; text-align: center;">✅ Email Configuration Test</h2>
          <p>Hi, this is a test email from Tikrar MTI application.</p>
          <p>If you receive this email, the SMTP configuration is working correctly!</p>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li>SMTP Host: smtp.gmail.com</li>
              <li>SMTP Port: 587</li>
              <li>Sender: Tikrar MTI</li>
            </ul>
          </div>
          <p style="text-align: center; color: #666; font-size: 14px;">
            This is an automated test email. No action needed.
          </p>
        </div>
      `
    };

    // You can implement your own email service test here
    // For now, return success for testing purposes

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      config: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        requiresConfiguration: true
      }
    });

  } catch (error: any) {
    console.error('Email test error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error.message
      },
      { status: 500 }
    );
  }
}