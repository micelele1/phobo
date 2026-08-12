"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { KioskStage, QrScreen } from "@/components/kiosk";
import { useSessionStore } from "@/lib/session/session-store";

export default function Payment() {
  const router = useRouter(); 
  const { session, hasHydrated, setPaymentStatus, setPaymentData } = useSessionStore(); 
  const [paymentActive, setPaymentActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Tentukan path gambar QR statis milikmu di sini
  // Pastikan file qris.png sudah kamu letakkan di dalam folder public
  const staticQrPath = "/qris.png";

  useEffect(() => { 
    if (hasHydrated && !session?.selectedPackageId) router.replace("/packages"); 
  }, [hasHydrated, session?.selectedPackageId, router]);

  useEffect(() => {
    if (!hasHydrated || !session?.sessionId || !session?.price) return;

    if (session.paymentOrderId) {
      setPaymentActive(true);
      setIsInitializing(false);
      return;
    }

    const initPayment = async () => {
      try {
        const res = await fetch("/api/payment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            packageId: session.packageId,
            packageName: session.packageName,
            amount: session.price,
          }),
        });
        const data = await res.json();
        
        if (data.ok) {
          setPaymentActive(true);
          // Hanya mengirimkan data yang diizinkan oleh tipe TypeScript bawaan aplikasimu
          setPaymentData({
            paymentOrderId: data.orderId,
            paymentAmount: session.price,
          });
        } else {
          setPaymentActive(false);
        }
      } catch (e) {
        console.error("Failed to init payment", e);
        setPaymentActive(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initPayment();
  }, [hasHydrated, session?.sessionId, session?.price, session?.paymentOrderId, setPaymentData]);

  useEffect(() => {
    if (!paymentActive || !session?.paymentOrderId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payment/status?orderId=${session.paymentOrderId}`);
        const data = await res.json();
        if (data.ok && data.status) {
          if (data.status === "confirmed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPaymentStatus("confirmed");
            router.push("/frames");
          } else if (data.status === "failed" || data.status === "timeout") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPaymentStatus(data.status);
          }
        }
      } catch (e) {
        // Error failed to fetch saat server recompile akan diabaikan
      }
    };

    pollIntervalRef.current = setInterval(checkStatus, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [paymentActive, session?.paymentOrderId, router, setPaymentStatus]);

  const basePrice = session?.price ?? 0;

  return (
    <KioskStage>
      <QrScreen 
        title={paymentActive ? "SCAN UNTUK BAYAR" : "PAYMENT ERROR"} 
        initialSeconds={120} 
        completionText="WAKTU HABIS" 
        onComplete={() => setPaymentStatus("timeout")} 
        qrContent={
          !isInitializing 
            ? paymentActive 
              ? (
                  <img 
                    src={staticQrPath} 
                    alt="Merchant QRIS" 
                    style={{width: '100%', height: '100%', objectFit: 'contain', background: '#fff', padding: '10px', borderRadius: '8px'}}
                  />
                )
              : <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#222', color: '#aaa', borderRadius: '8px', textAlign: 'center'}}>
                  <span style={{fontSize: '48px'}}>⚙️</span>
                  <span style={{marginTop: '10px', fontSize: '18px'}}>OFFLINE</span>
                </div>
            : <div className="qr-image" style={{display: "grid", placeItems: "center", background: "#fff", width:"100%", height:"100%", borderRadius: "8px"}}>...</div>
        } 
      />
      <div className="payment-summary">
        <div>{session?.packageName} - Rp. {basePrice.toLocaleString("id-ID")},00</div>
        
        {!paymentActive && !isInitializing && (
          <div style={{fontSize: 16, opacity: 0.7, marginTop: 10}}>
            Sistem pembayaran sedang tidak tersedia.
          </div>
        )}
      </div>
      
      {process.env.NEXT_PUBLIC_PAYMENT_DEBUG === "true" && (
        <button 
          className="operator-confirm" 
          onClick={() => {
            setPaymentStatus("confirmed");
            router.push("/frames");
          }}
        >
          SIMULATE PAYMENT
        </button>
      )}
    </KioskStage>
  );
}