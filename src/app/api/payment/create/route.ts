import { NextResponse } from "next/server";
import { setPaymentStatus } from "@/lib/payment/status-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (process.env.PAYMENT_ENABLED === "false") {
      return NextResponse.json({ ok: false, reason: "disabled" }, { status: 200 });
    }

    const { sessionId, packageId, packageName, amount } = await request.json();

    if (!sessionId || !amount) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const orderId = `phobo-${sessionId.replace(/[^a-zA-Z0-9-]/g, "")}-${Date.now()}`;
    
    setPaymentStatus(orderId, "pending");

    return NextResponse.json({
      ok: true,
      orderId,
      finalAmount: amount
    });
  } catch (error) {
    console.error("[Payment Create] Error:", error);
    return NextResponse.json({ ok: false, error: "Failed to create payment transaction" }, { status: 500 });
  }
}