import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { title, body: messageBody } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: "Title and body are required" },
        { status: 400 }
      );
    }

    // TODO: Phase 6 - Implement actual push notification broadcast
    // For now, return a placeholder response

    return NextResponse.json({
      success: true,
      status: "queued",
      message: "Push notification has been queued for delivery (Phase 6 implementation)",
      details: {
        title,
        message: messageBody,
        deliveredAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
