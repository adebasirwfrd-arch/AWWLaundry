-- Jalankan di Supabase Dashboard > SQL Editor
-- Mengaktifkan Supabase Realtime untuk chat & notifikasi (mengganti polling Vercel)

ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";

-- Pastikan bucket storage publik untuk bukti pembayaran & lampiran chat
-- (Dashboard > Storage > aww-laundry > Policies)
