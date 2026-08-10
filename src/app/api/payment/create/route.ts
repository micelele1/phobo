import { NextResponse } from "next/server";
import { generateUniqueCode } from "@/lib/payment/mutation";
import { setPaymentStatus } from "@/lib/payment/status-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { sessionId, packageId, packageName, amount } = await request.json();

    if (!sessionId || !amount) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // Mendapatkan angka acak 1-99 dari fungsi yang baru kita buat
    const uniqueCode = generateUniqueCode();
    
    // Menambahkan harga dasar paket dengan kode unik
    const finalAmount = amount + uniqueCode;

    const orderId = `phobo-${sessionId.replace(/[^a-zA-Z0-9-]/g, "")}-${Date.now()}`;
    
    // Mencatat pesanan baru ini ke dalam sistem memori agar bisa dibaca oleh dashboard operator
    // dan juga bisa dipantau oleh layar Kiosk
    setPaymentStatus(orderId, "pending");

    // Mengirimkan total tagihan yang baru ke layar Kiosk
    return NextResponse.json({
      ok: true,
      orderId,
      finalAmount,
      uniqueCode
    });
  } catch (error) {
    console.error("[Payment Create] Error:", error);
    
    // Menangkap error jika antrean 99 kode unik sedang penuh
    const errorMessage = error instanceof Error ? error.message : "Failed to create payment transaction";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}