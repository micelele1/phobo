"use client";
import { useEffect, useState } from "react";

interface ActiveOrder {
  orderId: string;
  status: string;
  amount: number;
  timestamp: number;
}

export default function OperatorDashboard() {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch("/api/payment/active");
      const data = await res.json();
      
      if (data.ok) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Gagal mengambil data pesanan", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmPayment = async (orderId: string) => {
    const isConfirmed = window.confirm(`Konfirmasi pembayaran lunas untuk pesanan ini?`);
    
    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/payment/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: "confirmed"
        }),
      });

      const data = await res.json();
      
      if (data.ok) {
        alert("Pesanan berhasil dikonfirmasi! Mesin photobox akan segera menyala.");
        fetchActiveOrders(); 
      } else {
        alert("Gagal mengonfirmasi pesanan.");
      }
    } catch (error) {
      console.error("Error konfirmasi pesanan", error);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>
        Dashboard Operator
      </h1>
      
      {isLoading ? (
        <p style={{ textAlign: "center" }}>Memuat data antrean...</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
          <p style={{ fontSize: "18px", color: "#666" }}>Belum ada antrean pesanan.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {orders.map((order) => (
            <div key={order.orderId} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "15px", backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", color: "#888" }}>ID: {order.orderId}</span>
                <span style={{ fontSize: "12px", backgroundColor: "#fff3cd", color: "#856404", padding: "2px 8px", borderRadius: "12px" }}>
                  {order.status.toUpperCase()}
                </span>
              </div>
              
              <div style={{ fontSize: "24px", margin: "10px 0" }}>
                Tagihan: Rp {order.amount.toLocaleString("id-ID")}
              </div>
              
              <button 
                onClick={() => handleConfirmPayment(order.orderId)}
                style={{ width: "100%", padding: "12px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", cursor: "pointer", marginTop: "10px" }}
              >
                KONFIRMASI LUNAS
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}