/* menangani pembuatan angka 1 hingga 99 dan logika daur ulang waktu.
menggunakan Map atau array in-memory untuk menyimpan daftar kode unik yang sedang aktif, lengkap dengan waktu pembuatannya (timestamp)*/

// src/lib/payment/mutation.ts

// Konstanta untuk batas waktu 2 jam dalam satuan milidetik
const RECYCLE_TIME_MS = 2 * 60 * 60 * 1000;

// In-memory store untuk menyimpan kode unik yang sedang aktif.
// Key: angka unik (1 - 99)
// Value: timestamp (waktu pembuatan dalam milidetik)
const activeCodes = new Map<number, number>();

export function generateUniqueCode(): number {
  const now = Date.now();

  // Langkah 1: Bersihkan memori dari kode yang sudah melewati batas waktu 2 jam
  for (const [code, timestamp] of activeCodes.entries()) {
    if (now - timestamp >= RECYCLE_TIME_MS) {
      activeCodes.delete(code);
    }
  }

  // Langkah 2: Cek apakah semua 99 kode sedang terpakai
  if (activeCodes.size >= 99) {
    throw new Error("Sistem sibuk, semua kode unik sedang terpakai. Silakan coba beberapa saat lagi.");
  }

  let uniqueCode: number = 0;
  let isCodeFound = false;

  // Langkah 3: Acak angka 1 hingga 99 sampai menemukan yang kosong
  while (!isCodeFound) {
    // Menghasilkan angka acak dari 1 sampai 99
    uniqueCode = Math.floor(Math.random() * 99) + 1;

    // Jika angka tersebut tidak ada di dalam Map yang aktif, berarti bisa digunakan
    if (!activeCodes.has(uniqueCode)) {
      isCodeFound = true;
    }
  }

  // Langkah 4: Simpan angka unik yang didapat ke dalam Map beserta waktu saat ini
  activeCodes.set(uniqueCode, now);

  return uniqueCode;
}

// Fungsi tambahan ini bisa dipanggil saat operator menekan tombol Konfirmasi Lunas,
// supaya kode unik tersebut bisa langsung dibebaskan sebelum menunggu 2 jam.
export function releaseUniqueCode(code: number) {
  activeCodes.delete(code);
}