import { NextResponse } from "next/server";
import { setPaymentStatus } from "@/lib/payment/status-store";
import type { PaymentStatus } from "@/lib/session/session-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ ok: false, error: "Data orderId atau status tidak lengkap" }, { status: 400 });
    }

    const validStatus: PaymentStatus = status as PaymentStatus;

    console.log(`[Internal Webhook] Status order ${orderId} diubah menjadi ${validStatus}`);
    
    setPaymentStatus(orderId, validStatus);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Internal Webhook] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}