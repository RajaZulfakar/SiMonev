export type Role = 'admin' | 'operator' | 'kabid' | 'kadis';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  bidang_id?: number;
}

export interface Project {
  id: number;
  nama_paket: string;
  pagu: number;
  nilai_kontrak: number;
  tahun_anggaran: number;
  lokasi_kab_kota: string;
  lat: number;
  long: number;
  bidang_id: number;
  nama_bidang: string;
  status_verifikasi: number;
}

export interface ProgressUpdate {
  id: number;
  project_id: number;
  fisik_kumulatif: number;
  keuangan_nominal: number;
  termin_ke: number;
  keterangan_kendala: string;
  solusi_saran: string;
  status_verifikasi: number;
  created_at: string;
}
