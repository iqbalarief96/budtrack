import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { testBrevoEmail } from "@/lib/test-brevo";

// Per-user cooldown so a logged-in user can't drain the shared Brevo quota.
// In-memory: fine for a single Node process; resets on restart.
const COOLDOWN_MS = 5 * 60 * 1000;
const lastSentAt = new Map<string, number>();

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

    const now = Date.now();
    const last = lastSentAt.get(session.user.id) ?? 0;
    if (now - last < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      return NextResponse.json(
        { success: false, message: `Tunggu ${retryAfter} detik sebelum kirim test email lagi.` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    lastSentAt.set(session.user.id, now);

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