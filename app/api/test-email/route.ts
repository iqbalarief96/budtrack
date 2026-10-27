import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { testBrevoEmail } from "@/lib/test-brevo";

export async function POST(req: NextRequest) {
  try {
    // Must be logged in, and can only send to your own address — otherwise
    // this endpoint is an open relay that burns the Brevo quota.
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!session?.user?.id || !email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
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