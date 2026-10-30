// ==============================================================================
// BERKAS: src/services/sagaService.js
// TUJUAN: Simulator pola SAGA (Distributed Transactions) dengan Transaksi Kompensasi.
// RUJUKAN SLIDE:
//   - Slide 40: "Saga: transaksi lintas service dengan kompensasi.
//                01 Reservasi (simpan state) -> 02 Bayar -> 03 Konfirmasi.
//                Jika gagal: Batalkan reservasi atau refund sesuai aturan.
//                Kompensasi bukan rollback database universal dan bisa gagal juga!"
// ==============================================================================

import { createSagaOrder, updateSagaOrder } from "../db.js";
import { pinoLogger } from "../logger.js";

export class SagaService {
  /**
   * Menjalankan orchestrasi alur Saga 3 Langkah (Slide 40)
   * @param {Object} orderData { item: string, amount: number }
   * @param {boolean} simulatePaymentFailure Simulasi pembayaran gagal
   */
  async executeOrderSaga(orderData, simulatePaymentFailure = false) {
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const history = [];

    // --- LANGKAH 1: RESERVASI (Slide 40: 01 Reservasi) ---
    const sagaRecord = {
      id: orderId,
      order_id: orderId,
      item: orderData.item || "Server Cloud Dedicated",
      amount: orderData.amount || 500000,
      status: "RESERVED",
      step: "01_RESERVATION",
      error_message: null,
    };
    createSagaOrder(sagaRecord);
    history.push({ step: "01_RESERVATION", status: "SUCCESS", detail: `Stok/resource ${sagaRecord.item} direservasi` });
    pinoLogger.info({ orderId, step: "RESERVATION" }, "✅ [SAGA 01] Reservasi lokal berhasil dicatat");

    // --- LANGKAH 2: PROSES PEMBAYARAN DI PAYMENT GATEWAY (Slide 40: 02 Bayar) ---
    if (simulatePaymentFailure) {
      // Pembayaran Gagal! Menjalankan Transaksi Kompensasi (Slide 40)
      pinoLogger.warn({ orderId }, "⚠️ [SAGA 02] Pembayaran eksternal gagal! Menjalankan Transaksi Kompensasi...");
      history.push({ step: "02_PAYMENT", status: "FAILED", detail: "Pembayaran eksternal ditolak oleh bank/gateway" });

      // --- KOMPENSASI: BATALKAN RESERVASI ---
      updateSagaOrder(orderId, "CANCELLED", "COMPENSATED_CANCEL_RESERVATION", "Pembayaran ditolak: reservasi dibatalkan secara kompensasi");
      history.push({
        step: "COMPENSATION",
        status: "COMPENSATED",
        detail: "Transaksi kompensasi: Reservasi resource dibatalkan, kuota dikembalikan",
      });

      return {
        success: false,
        orderId,
        finalStatus: "CANCELLED",
        error: "Pembayaran eksternal gagal. Alur dibatalkan melalui Transaksi Kompensasi.",
        history,
      };
    }

    // Jika pembayaran berhasil
    updateSagaOrder(orderId, "PAID", "02_PAYMENT_SUCCESS");
    history.push({ step: "02_PAYMENT", status: "SUCCESS", detail: `Pembayaran Rp${sagaRecord.amount} sukses diproses` });
    pinoLogger.info({ orderId, step: "PAYMENT" }, "✅ [SAGA 02] Pembayaran berhasil diverifikasi");

    // --- LANGKAH 3: KONFIRMASI AKHIR (Slide 40: 03 Konfirmasi) ---
    updateSagaOrder(orderId, "CONFIRMED", "03_CONFIRMED");
    history.push({ step: "03_CONFIRMATION", status: "SUCCESS", detail: "Order dikonfirmasi penuh dan tiket diterbitkan" });
    pinoLogger.info({ orderId, step: "CONFIRMATION" }, "🎉 [SAGA 03] Alur Saga sukses ditutup sesuai aturan domain");

    return {
      success: true,
      orderId,
      finalStatus: "CONFIRMED",
      history,
    };
  }
}

export const sagaService = new SagaService();
