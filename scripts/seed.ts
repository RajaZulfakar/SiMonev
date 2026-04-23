
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const KAB_KOTA_KEPRI = [
  "Batam",
  "Tanjungpinang",
  "Bintan",
  "Karimun",
  "Kepulauan Anambas",
  "Lingga",
  "Natuna"
];

async function seed() {
  console.log("Starting seed...");

  // 1. Seed Bidang
  const bidang = [
    { id: 'bidang_sda', nama_bidang: 'SDA' },
    { id: 'bidang_bm', nama_bidang: 'Bina Marga' },
    { id: 'bidang_ck', nama_bidang: 'Cipta Karya' },
    { id: 'bidang_pt', nama_bidang: 'Pertanahan' }
  ];

  for (const b of bidang) {
    await setDoc(doc(db, 'bidang', b.id), { nama_bidang: b.nama_bidang });
    console.log(`Seeded bidang: ${b.nama_bidang}`);
  }

  // 2. Seed Projects (15 samples)
  const currentYear = new Date().getFullYear();
  const sampleProjects = [
    { name: "Pembangunan Jembatan Dompak", pagu: 50e9, kontrak: 48.5e9, loc: "Tanjungpinang", lat: 0.8917, long: 104.4511, bidang: 'bidang_bm', progress: 85, kendala: "Cuaca hujan menghambat pengecoran." },
    { name: "Rehabilitasi Waduk Sei Gong", pagu: 25e9, kontrak: 24e9, loc: "Batam", lat: 1.0456, long: 104.0301, bidang: 'bidang_sda', progress: 60, kendala: "Mobilisasi alat berat terkendala akses." },
    { name: "Peningkatan Jalan Lingkar Karimun", pagu: 15e9, kontrak: 14.2e9, loc: "Karimun", lat: 1.0006, long: 103.3896, bidang: 'bidang_bm', progress: 45, kendala: "Keterlambatan pengiriman material agregat." },
    { name: "Irigasi Wanareja Lingga", pagu: 8e9, kontrak: 7.8e9, loc: "Lingga", lat: -0.2185, long: 104.5772, bidang: 'bidang_sda', progress: 95, kendala: "Tidak ada kendala berarti." },
    { name: "Drainase Perkotaan Batam Center", pagu: 12e9, kontrak: 11.5e9, loc: "Batam", lat: 1.1275, long: 104.0531, bidang: 'bidang_ck', progress: 20, kendala: "Adanya utilitas pipa yang perlu direlokasi." },
    { name: "Pembangunan Gedung Kantor Natuna", pagu: 20e9, kontrak: 19.5e9, loc: "Natuna", lat: 3.9455, long: 108.3828, bidang: 'bidang_ck', progress: 100, kendala: "Pekerjaan selesai 100%." },
    { name: "Peningkatan Jalan Strategis Anambas", pagu: 18e9, kontrak: 17.6e9, loc: "Kepulauan Anambas", lat: 3.2173, long: 106.2625, bidang: 'bidang_bm', progress: 70, kendala: "Ketersediaan BBM untuk alat berat terbatas." },
    { name: "Normalisasi Sungai Bintan Buyu", pagu: 5e9, kontrak: 4.8e9, loc: "Bintan", lat: 1.0963, long: 104.4842, bidang: 'bidang_sda', progress: 35, kendala: "Proses pembebasan lahan masih berjalan." },
    { name: "Penataan Kawasan Pesisir Gurindam 12", pagu: 100e9, kontrak: 95e9, loc: "Tanjungpinang", lat: 0.9221, long: 104.4442, bidang: 'bidang_pt', progress: 15, kendala: "Gelombang tinggi menghambat pekerjaan timbunan." },
    { name: "Jalan Poros Lingga Utara", pagu: 10e9, kontrak: 9.8e9, loc: "Lingga", lat: -0.1500, long: 104.6000, bidang: 'bidang_bm', progress: 10, kendala: "Baru mulai mobilisasi alat dan tenaga kerja." },
    { name: "Sistem Penyediaan Air Minum Natuna", pagu: 7e9, kontrak: 6.8e9, loc: "Natuna", lat: 4.0000, long: 108.4000, bidang: 'bidang_ck', progress: 50, kendala: "Izin lintasan pipa sedang diproses." },
    { name: "Rehabilitasi Jalan Pelabuhan Karimun", pagu: 12e9, kontrak: 11.8e9, loc: "Karimun", lat: 1.0100, long: 103.4000, bidang: 'bidang_bm', progress: 30, kendala: "Kepadatan lalu lintas di area pelabuhan." },
    { name: "Embungs Air Baku Natuna", pagu: 6e9, kontrak: 5.5e9, loc: "Natuna", lat: 3.9500, long: 108.3500, bidang: 'bidang_sda', progress: 75, kendala: "Lahan berbatu keras memperlambat galian." },
    { name: "Penyediaan Air Bersih Bintan", pagu: 4.5e9, kontrak: 4.2e9, loc: "Bintan", lat: 1.1000, long: 104.5000, bidang: 'bidang_sda', progress: 40, kendala: "Pompa utama masih dalam pengiriman." },
    { name: "Rehabilitasi Pipa Transmisi Batam", pagu: 9e9, kontrak: 8.7e9, loc: "Batam", lat: 1.0500, long: 104.0400, bidang: 'bidang_sda', progress: 55, kendala: "Kebocoran ditemukan pada titik sambungan lama." }
  ];

  for (const p of sampleProjects) {
    const projectDoc = await addDoc(collection(db, 'projects'), {
      nama_paket: p.name,
      pagu: p.pagu,
      nilai_kontrak: p.kontrak,
      tahun_anggaran: currentYear,
      lokasi_kab_kota: p.loc,
      lat: p.lat,
      long: p.long,
      bidang_id: p.bidang,
      status_verifikasi: 1,
      created_at: serverTimestamp()
    });

    // Add initial update
    await addDoc(collection(db, 'projects', projectDoc.id, 'updates'), {
      project_id: projectDoc.id,
      fisik_kumulatif: p.progress,
      keuangan_nominal: p.kontrak * (p.progress / 100) * 0.9,
      termin_ke: 1,
      keterangan_kendala: p.kendala,
      status_verifikasi: 1,
      created_at: serverTimestamp()
    });

    console.log(`Seeded project: ${p.name}`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
