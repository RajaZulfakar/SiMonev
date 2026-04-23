import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";

const db = new Database("simonev.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS bidang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_bidang TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK(role IN ('admin', 'operator', 'kabid', 'kadis')) NOT NULL,
    bidang_id INTEGER,
    FOREIGN KEY(bidang_id) REFERENCES bidang(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_paket TEXT NOT NULL,
    pagu REAL NOT NULL,
    nilai_kontrak REAL NOT NULL,
    tahun_anggaran INTEGER NOT NULL,
    lokasi_kab_kota TEXT NOT NULL,
    lat REAL,
    long REAL,
    bidang_id INTEGER,
    status_verifikasi INTEGER DEFAULT 0,
    FOREIGN KEY(bidang_id) REFERENCES bidang(id)
  );

  CREATE TABLE IF NOT EXISTS progress_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    fisik_kumulatif REAL NOT NULL,
    keuangan_nominal REAL NOT NULL,
    termin_ke INTEGER NOT NULL,
    keterangan_kendala TEXT,
    solusi_saran TEXT,
    status_verifikasi INTEGER DEFAULT 0, -- 0: Pending, 1: Verified, 2: Rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS project_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    progress_id INTEGER NOT NULL,
    foto_path TEXT NOT NULL,
    label TEXT NOT NULL, -- '0%', '50%', '100%'
    FOREIGN KEY(progress_id) REFERENCES progress_updates(id)
  );
`);

// Seed initial data
const bidangCount = db.prepare("SELECT count(*) as count FROM bidang").get() as { count: number };
if (bidangCount.count === 0) {
  const insertBidang = db.prepare("INSERT INTO bidang (nama_bidang) VALUES (?)");
  ["SDA", "Bina Marga", "Cipta Karya", "Pertanahan"].forEach(b => insertBidang.run(b));
}

const checkUser = db.prepare("SELECT count(*) as count FROM users WHERE email = ?");
const insertUser = db.prepare("INSERT INTO users (name, email, role, bidang_id) VALUES (?, ?, ?, ?)");
if ((checkUser.get("admin@kepri.go.id") as { count: number }).count === 0) {
  insertUser.run("Admin E-MON", "admin@kepri.go.id", "admin", null);
  insertUser.run("Operator SDA", "operator@kepri.go.id", "operator", 1);
  insertUser.run("Kabid SDA", "kabid@kepri.go.id", "kabid", 1);
  insertUser.run("Kadis PUPR", "kadis@kepri.go.id", "kadis", null);
}

const currentYear = new Date().getFullYear();
const checkProject = db.prepare("SELECT count(*) as count FROM projects WHERE nama_paket = ?");
const insertProject = db.prepare("INSERT INTO projects (nama_paket, pagu, nilai_kontrak, tahun_anggaran, lokasi_kab_kota, lat, long, bidang_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
const insertUpdate = db.prepare(`
  INSERT INTO progress_updates (project_id, fisik_kumulatif, keuangan_nominal, termin_ke, keterangan_kendala, solusi_saran, status_verifikasi)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const sampleProjects = [
  { name: "Pembangunan Jembatan Dompak", pagu: 50e9, kontrak: 48.5e9, loc: "Tanjungpinang", lat: 0.8917, long: 104.4511, bidang: 2, progress: 85, kendala: "Cuaca hujan menghambat pengecoran." },
  { name: "Rehabilitasi Waduk Sei Gong", pagu: 25e9, kontrak: 24e9, loc: "Batam", lat: 1.0456, long: 104.0301, bidang: 1, progress: 60, kendala: "Mobilisasi alat berat terkendala akses." },
  { name: "Peningkatan Jalan Lingkar Karimun", pagu: 15e9, kontrak: 14.2e9, loc: "Karimun", lat: 1.0006, long: 103.3896, bidang: 2, progress: 45, kendala: "Keterlambatan pengiriman material agregat." },
  { name: "Irigasi Wanareja Lingga", pagu: 8e9, kontrak: 7.8e9, loc: "Lingga", lat: -0.2185, long: 104.5772, bidang: 1, progress: 95, kendala: "Tidak ada kendala berarti." },
  { name: "Drainase Perkotaan Batam Center", pagu: 12e9, kontrak: 11.5e9, loc: "Batam", lat: 1.1275, long: 104.0531, bidang: 3, progress: 20, kendala: "Adanya utilitas pipa yang perlu direlokasi." },
  { name: "Pembangunan Gedung Kantor Natuna", pagu: 20e9, kontrak: 19.5e9, loc: "Natuna", lat: 3.9455, long: 108.3828, bidang: 3, progress: 100, kendala: "Pekerjaan selesai 100%." },
  { name: "Peningkatan Jalan Strategis Anambas", pagu: 18e9, kontrak: 17.6e9, loc: "Kepulauan Anambas", lat: 3.2173, long: 106.2625, bidang: 2, progress: 70, kendala: "Ketersediaan BBM untuk alat berat terbatas." },
  { name: "Normalisasi Sungai Bintan Buyu", pagu: 5e9, kontrak: 4.8e9, loc: "Bintan", lat: 1.0963, long: 104.4842, bidang: 1, progress: 35, kendala: "Proses pembebasan lahan masih berjalan." },
  { name: "Penataan Kawasan Pesisir Gurindam 12", pagu: 100e9, kontrak: 95e9, loc: "Tanjungpinang", lat: 0.9221, long: 104.4442, bidang: 4, progress: 15, kendala: "Gelombang tinggi menghambat pekerjaan timbunan." },
  { name: "Jalan Poros Lingga Utara", pagu: 10e9, kontrak: 9.8e9, loc: "Lingga", lat: -0.1500, long: 104.6000, bidang: 2, progress: 10, kendala: "Baru mulai mobilisasi alat dan tenaga kerja." },
  { name: "Sistem Penyediaan Air Minum Natuna", pagu: 7e9, kontrak: 6.8e9, loc: "Natuna", lat: 4.0000, long: 108.4000, bidang: 3, progress: 50, kendala: "Izin lintasan pipa sedang diproses." },
  { name: "Rehabilitasi Jalan Pelabuhan Karimun", pagu: 12e9, kontrak: 11.8e9, loc: "Karimun", lat: 1.0100, long: 103.4000, bidang: 2, progress: 30, kendala: "Kepadatan lalu lintas di area pelabuhan." },
  { name: "Embungs Air Baku Natuna", pagu: 6e9, kontrak: 5.5e9, loc: "Natuna", lat: 3.9500, long: 108.3500, bidang: 1, progress: 75, kendala: "Lahan berbatu keras memperlambat galian." },
  { name: "Penyediaan Air Bersih Bintan", pagu: 4.5e9, kontrak: 4.2e9, loc: "Bintan", lat: 1.1000, long: 104.5000, bidang: 1, progress: 40, kendala: "Pompa utama masih dalam pengiriman." },
  { name: "Rehabilitasi Pipa Transmisi Batam", pagu: 9e9, kontrak: 8.7e9, loc: "Batam", lat: 1.0500, long: 104.0400, bidang: 1, progress: 55, kendala: "Kebocoran ditemukan pada titik sambungan lama." }
];

sampleProjects.forEach(p => {
  if ((checkProject.get(p.name) as { count: number }).count === 0) {
    const res = insertProject.run(p.name, p.pagu, p.kontrak, currentYear, p.loc, p.lat, p.long, p.bidang);
    const projectId = res.lastInsertRowid;
    insertUpdate.run(projectId, p.progress, p.kontrak * (p.progress / 100) * 0.9, 1, p.kendala, "Lanjutkan pengerjaan sesuai target.", 1);
  }
});

const app = express();
app.use(express.json());

// File Upload Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });
app.use("/uploads", express.static("uploads"));

// API Routes
app.get("/api/projects", (req, res) => {
  const { role, bidang_id } = req.query;
  let query = "SELECT p.*, b.nama_bidang FROM projects p JOIN bidang b ON p.bidang_id = b.id";
  const params: any[] = [];

  // Filter by bidang for operator/kabid
  if ((role === 'operator' || role === 'kabid') && bidang_id) {
    query += " WHERE p.bidang_id = ?";
    params.push(bidang_id);
  }

  const projects = db.prepare(query).all(...params);
  res.json(projects);
});

app.get("/api/projects/:id", (req, res) => {
  const project = db.prepare("SELECT p.*, b.nama_bidang FROM projects p JOIN bidang b ON p.bidang_id = b.id WHERE p.id = ?").get(req.params.id);
  const updates = db.prepare("SELECT * FROM progress_updates WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id);
  
  // Fetch all photos for this project
  const photos = db.prepare(`
    SELECT pp.* 
    FROM project_photos pp
    JOIN progress_updates pu ON pp.progress_id = pu.id
    WHERE pu.project_id = ?
    ORDER BY pu.created_at DESC
  `).all(req.params.id);

  res.json({ ...project, updates, photos });
});

app.post("/api/progress", upload.array("photos"), (req, res) => {
  const { project_id, fisik_kumulatif, keuangan_nominal, termin_ke, keterangan_kendala, solusi_saran } = req.body;
  
  const insertUpdate = db.prepare(`
    INSERT INTO progress_updates (project_id, fisik_kumulatif, keuangan_nominal, termin_ke, keterangan_kendala, solusi_saran, status_verifikasi)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `);
  
  const result = insertUpdate.run(project_id, fisik_kumulatif, keuangan_nominal, termin_ke, keterangan_kendala, solusi_saran);
  const progressId = result.lastInsertRowid;

  const files = req.files as Express.Multer.File[];
  if (files && Array.isArray(files)) {
    const insertPhoto = db.prepare("INSERT INTO project_photos (progress_id, foto_path, label) VALUES (?, ?, ?)");
    files.forEach((file, index) => {
      // Simple label logic based on progress or index
      const label = fisik_kumulatif >= 100 ? "100%" : (fisik_kumulatif >= 50 ? "50%" : "0%");
      insertPhoto.run(progressId, file.path, label);
    });
  }

  res.json({ success: true, id: progressId });
});

app.get("/api/bidang", (req, res) => {
  const bidang = db.prepare("SELECT * FROM bidang").all();
  res.json(bidang);
});

app.post("/api/projects", (req, res) => {
  const { nama_paket, pagu, nilai_kontrak, tahun_anggaran, lokasi_kab_kota, lat, long, bidang_id } = req.body;
  const insertProject = db.prepare(`
    INSERT INTO projects (nama_paket, pagu, nilai_kontrak, tahun_anggaran, lokasi_kab_kota, lat, long, bidang_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insertProject.run(nama_paket, pagu, nilai_kontrak, tahun_anggaran, lokasi_kab_kota, lat || 0, long || 0, bidang_id);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.put("/api/projects/:id", (req, res) => {
  const { nama_paket, pagu, nilai_kontrak, tahun_anggaran, lokasi_kab_kota, lat, long, bidang_id } = req.body;
  const updateProject = db.prepare(`
    UPDATE projects 
    SET nama_paket = ?, pagu = ?, nilai_kontrak = ?, tahun_anggaran = ?, lokasi_kab_kota = ?, lat = ?, long = ?, bidang_id = ?
    WHERE id = ?
  `);
  updateProject.run(nama_paket, pagu, nilai_kontrak, tahun_anggaran, lokasi_kab_kota, lat || 0, long || 0, bidang_id, req.params.id);
  res.json({ success: true });
});

app.delete("/api/projects/:id", (req, res) => {
  // Optional: check if there are progress updates and handle accordingly
  db.prepare("DELETE FROM progress_updates WHERE project_id = ?").run(req.params.id);
  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/verify", (req, res) => {
  const { progress_id, status, role } = req.body;
  if (role !== 'kabid') return res.status(403).json({ error: "Hanya Kepala Bidang yang dapat melakukan verifikasi" });

  db.prepare("UPDATE progress_updates SET status_verifikasi = ? WHERE id = ?").run(status, progress_id);
  res.json({ success: true });
});

app.get("/api/dashboard/stats", (req, res) => {
  const currentYear = new Date().getFullYear();
  
  const totalProjects = db.prepare("SELECT count(*) as count FROM projects").get() as any;
  const totalPagu = db.prepare("SELECT sum(pagu) as sum FROM projects").get() as any;
  
  // Average of the latest verified progress for each project
  const avgProgress = db.prepare(`
    SELECT AVG(latest_fisik) as avg FROM (
      SELECT MAX(pu.fisik_kumulatif) as latest_fisik
      FROM progress_updates pu
      JOIN projects p ON pu.project_id = p.id
      WHERE pu.status_verifikasi = 1
      GROUP BY p.id
    )
  `).get() as any;

  res.json({
    totalProjects: totalProjects.count,
    totalPagu: totalPagu.sum || 0,
    avgProgress: avgProgress?.avg || 0
  });
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
