import { NextRequest, NextResponse } from "next/server";
import { testBrevoEmail } from "@/lib/test-brevo";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Missing email parameter" },
        { status: 400 }
      );
    }
    
    // Kirim email test
    const result = await testBrevoEmail(email);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        messageId: result.messageId
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to send test email", 
          error: result.error 
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("Error in test-email API:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error },
      { status: 500 }
    );
  }
} 