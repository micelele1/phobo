"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { KioskStage, QrScreen } from "@/components/kiosk";
import { useSessionStore } from "@/lib/session/session-store";

export default function Payment() {
  const router = useRouter(); 
  const { session, hasHydrated, setPaymentStatus, setPaymentData } = useSessionStore(); 
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { 
    if (hasHydrated && !session?.selectedPackageId) router.replace("/packages"); 
  }, [hasHydrated, session?.selectedPackageId, router]);

  useEffect(() => {
    if (!hasHydrated || !session?.sessionId || !session?.price) return;

    // Mencegah pembuatan transaksi ganda jika sesi sudah memiliki orderId
    if (session.paymentOrderId && session.paymentAmount) {
      setFinalAmount(session.paymentAmount);
      setPaymentEnabled(true);
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
          setPaymentEnabled(true);
          setFinalAmount(data.finalAmount);
          
          setPaymentData({
            paymentOrderId: data.orderId,
            paymentAmount: data.finalAmount, // Menyimpan harga unik ke memori sesi
          });
        } else {
          setPaymentEnabled(false);
        }
      } catch (e) {
        console.error("Failed to init payment", e);
        setPaymentEnabled(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initPayment();
  }, [hasHydrated, session?.sessionId, session?.price, session?.paymentOrderId, session?.paymentAmount, setPaymentData]);

  // Polling untuk mengecek status pembayaran dari operator
  useEffect(() => {
    if (!paymentEnabled || !session?.paymentOrderId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payment/status?orderId=${session.paymentOrderId}`);
        const data = await res.json();
        
        if (data.ok && data.status) {
          // Menerima status confirmed atau paid dari dashboard operator
          if (data.status === "confirmed" || data.status === "paid") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPaymentStatus("confirmed");
            router.push("/frames");
          } else if (data.status === "failed" || data.status === "timeout") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPaymentStatus(data.status);
          }
        }
      } catch (e) {
        console.error("Failed to poll status", e);
      }
    };

    pollIntervalRef.current = setInterval(checkStatus, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [paymentEnabled, session?.paymentOrderId, router, setPaymentStatus]);

  // Fungsi untuk memformat angka Rupiah dan menebalkan 3 digit terakhir
  const renderFormattedPrice = (amount: number | null) => {
    if (!amount) return "Rp. 0,00";
    const formatted = amount.toLocaleString("id-ID");
    const parts = formatted.split('.');
    
    if (parts.length > 1) {
      const lastPart = parts.pop();
      const frontPart = parts.join('.');
      return <>Rp. {frontPart}.<b>{lastPart}</b>,00</>;
    }
    
    return <>Rp. <b>{formatted}</b>,00</>;
  };

  return (
    <KioskStage>
      <QrScreen 
        title={paymentEnabled ? "SCAN UNTUK BAYAR" : "PAYMENT ERROR"} 
        initialSeconds={180} 
        completionText="WAKTU HABIS" 
        onComplete={() => setPaymentStatus("timeout")} 
        qrContent={
          !isInitializing 
            ? paymentEnabled 
              ? <img src="/qris.png" alt="QRIS" style={{width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px'}} />
              : <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#222', color: '#aaa', borderRadius: '8px', textAlign: 'center'}}>
                  <span style={{fontSize: '48px'}}>⚙️</span>
                  <span style={{marginTop: '10px', fontSize: '18px'}}>OFFLINE</span>
                </div>
            : <div className="qr-image" style={{display: "grid", placeItems: "center", background: "#fff", width:"100%", height:"100%", borderRadius: "8px"}}>...</div>
        } 
      />
      <div className="payment-summary" style={{ textAlign: "center" }}>
        
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>
          {session?.packageName} - {renderFormattedPrice(finalAmount)}
        </div>
        
        {paymentEnabled && (
          <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px' }}>
            <p style={{ margin: 0, fontSize: '16px' }}>
              Mohon pastikan <b>tiga digit terakhir</b> Anda sesuai.
            </p>
          </div>
        )}
        
        {session?.paymentOrderId && (
          <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#222', borderRadius: '8px', border: '1px solid #444' }}>
            <p style={{ fontSize: '14px', color: '#aaa', margin: '0 0 5px 0' }}>Jika terjadi kendala, silakan foto layar ini</p>
            <p style={{ fontSize: '18px', fontFamily: 'monospace', margin: '0', color: '#fff', letterSpacing: '2px' }}>
              ID: {session.paymentOrderId}
            </p>
          </div>
        )}

        {!paymentEnabled && !isInitializing && (
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