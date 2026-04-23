import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  UserCircle, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  LogOut, 
  Search, 
  Sun, 
  Moon,
  Eye,
  Edit,
  Trash2,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Firebase imports ---
import { auth as firebaseAuth, db, googleProvider, handleFirestoreError } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp,
  addDoc,
  orderBy,
  updateDoc,
  deleteDoc,
  getDocs,
  limit
} from 'firebase/firestore';

// --- Types ---
import { Role, User, Project, ProgressUpdate } from './types';

// --- Constants ---
const KAB_KOTA_KEPRI = [
  "Batam",
  "Tanjungpinang",
  "Bintan",
  "Karimun",
  "Kepulauan Anambas",
  "Lingga",
  "Natuna"
];

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Theme Context ---
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('simonev_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('simonev_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ id: firebaseUser.uid, ...userDoc.data() } as any);
          } else {
            // Default role for new users if needed, or handle profile creation
            // For this app, we'll assume admins are pre-registered or assigned
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (role: Role) => {
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const firebaseUser = result.user;
      
      // Check if user already exists
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        const userData = {
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          role: role,
          bidang_id: (role === 'operator' || role === 'kabid') ? 'bidang_sda' : null
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        setUser({ id: firebaseUser.uid, ...userData } as any);
      } else {
        // User exists, just update local state with existing data
        setUser({ id: firebaseUser.uid, ...userDoc.data() } as any);
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Gagal Login: " + (error as Error).message);
    }
  };

  const logout = () => signOut(firebaseAuth);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// --- Components ---

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <nav className="bg-[var(--bg)] border-b border-[var(--border)] px-4 md:px-8 py-4 md:py-6 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300">
      <Link to="/" className="flex items-center gap-3 md:gap-4 md:hidden hover:opacity-80 transition-opacity">
        <div className="bg-[var(--fg)] p-1.5 md:p-2 shrink-0">
          <LayoutDashboard className="text-[var(--bg)] w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-[var(--fg)] uppercase leading-none">E-MON</h1>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-500 mt-0.5">BIMA KEPRI</p>
        </div>
      </Link>
      
      <div className="flex items-center gap-4 md:gap-8 ml-auto">
        <button 
          onClick={toggleTheme}
          className="p-2 border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all"
          title="Ganti Tema"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> : <Sun className="w-4 h-4 md:w-5 md:h-5" />}
        </button>

        <div className="flex items-center gap-3 md:gap-4 md:pr-8 md:border-r md:border-[var(--muted-border)]">
          <div className="text-right hidden sm:block">
            <p className="text-xs md:text-sm font-black text-[var(--fg)] uppercase">{user?.name}</p>
            <p className="text-[8px] md:text-[10px] text-[var(--fg)] font-bold uppercase tracking-widest opacity-50">
              {user?.role === 'admin' ? 'Administrator' : 
               user?.role === 'operator' ? 'Operator Bidang' : 
               user?.role === 'kabid' ? 'Kepala Bidang' : 'Kepala Dinas'}
            </p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[var(--fg)] flex items-center justify-center">
            <UserCircle className="w-5 h-5 md:w-6 md:h-6 text-[var(--bg)]" />
          </div>
        </div>
        <button 
          onClick={logout}
          className="text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all p-1.5 md:p-2 border border-[var(--border)]"
        >
          <LogOut className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </nav>
  );
};

const Sidebar = () => {
  const { user } = useAuth();
  const navItems = [
    { icon: LayoutDashboard, label: 'Beranda', path: '/', roles: ['admin', 'kadis', 'kabid', 'operator'] },
    { icon: ClipboardList, label: 'Proyek', path: '/projects', roles: ['admin', 'kadis', 'kabid', 'operator'] },
    { icon: HelpCircle, label: 'Tutorial', path: '/tutorial', roles: ['admin', 'kadis', 'kabid', 'operator'] },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-20 lg:w-64 bg-[var(--bg)] border-r border-[var(--border)] h-screen flex-col sticky top-0 transition-colors duration-300">
        <Link to="/" className="px-4 lg:px-8 py-6 md:py-8 border-b border-[var(--border)] flex items-center gap-3 md:gap-4 hover:bg-[var(--fg)] group/logo transition-colors">
          <div className="bg-[var(--fg)] group-hover/logo:bg-[var(--bg)] p-1.5 md:p-2 shrink-0">
            <LayoutDashboard className="text-[var(--bg)] group-hover/logo:text-[var(--fg)] w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="hidden lg:block text-left">
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-[var(--fg)] group-hover/logo:text-[var(--bg)] uppercase leading-none">E-MON</h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 group-hover/logo:text-[var(--bg)]/60 mt-0.5">BIMA KEPRI</p>
          </div>
        </Link>
        <div className="flex-1 py-8">
          {navItems.filter(item => item.roles.includes(user?.role || '')).map(item => (
            <Link 
              key={item.path}
              to={item.path}
              className="flex items-center gap-4 px-8 py-4 text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all font-bold uppercase text-xs tracking-widest border-b border-transparent"
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="p-8 border-t border-[var(--border)]">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30 text-[var(--fg)]">© 2026 PUPR KEPRI</p>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg)] border-t border-[var(--border)] z-50 flex justify-around items-center h-16 px-4 transition-colors duration-300">
        {navItems.filter(item => item.roles.includes(user?.role || '')).map(item => (
          <Link 
            key={item.path}
            to={item.path}
            className="flex flex-col items-center justify-center gap-1 text-[var(--fg)] font-black uppercase text-[8px] tracking-widest"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};

const MobileNav = () => null; // Placeholder as it's included in Sidebar

const Dashboard = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Fetch all bidang for mapping
    let bidangMap: Record<string, string> = {};
    onSnapshot(collection(db, 'bidang'), (snap) => {
      snap.docs.forEach(doc => {
        bidangMap[doc.id] = doc.data().nama_bidang;
      });
    });

    // Listen to projects from Firestore
    const unsubscribeProjects = onSnapshot(collection(db, 'projects'), async (snapshot) => {
      const projectsBatch = await Promise.all(snapshot.docs.map(async (pDoc) => {
        const pId = pDoc.id;
        const pData = pDoc.data();
        const qUpdate = query(collection(db, 'projects', pId, 'updates'), orderBy('created_at', 'desc'), limit(1));
        const uSnap = await getDocs(qUpdate);
        return { 
          id: pId, 
          ...pData,
          nama_bidang: bidangMap[pData.bidang_id] || 'SDA', // Fallback or mapping
          latestUpdate: uSnap.docs[0]?.data() || null 
        };
      }));
      setProjects(projectsBatch as any);

      // Calculate stats based on fetched projects with updates
      const totalPaguValue = projectsBatch.reduce((acc, p: any) => acc + (p.pagu || 0), 0);
      const verifiedProjects = projectsBatch.filter((p: any) => p.latestUpdate?.status_verifikasi === 1);
      const avgProgressValue = verifiedProjects.length > 0 
        ? verifiedProjects.reduce((acc, p: any) => acc + (p.latestUpdate?.fisik_kumulatif || 0), 0) / verifiedProjects.length
        : 0;

      setStats({
        totalProjects: projectsBatch.length,
        totalPagu: totalPaguValue,
        avgProgress: avgProgressValue
      });
    });

    return () => {
      unsubscribeProjects();
    };
  }, []);

  const filteredProjects = projects.filter(p => 
    p.nama_paket.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nama_bidang.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lokasi_kab_kota.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[var(--bg)] min-h-full pb-20 md:pb-0 transition-colors duration-300">
      {/* Header Stats - Minimalist */}
      <div className="grid grid-cols-3 border-b border-[var(--border)]">
        <div className="p-4 md:p-8 border-r border-[var(--border)] flex flex-col justify-between h-24 md:h-40">
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Total Proyek</p>
          <h3 className="text-2xl md:text-6xl font-black tracking-tighter leading-none text-[var(--fg)]">{stats?.totalProjects || 0}</h3>
        </div>
        <div className="p-4 md:p-8 border-r border-[var(--border)] flex flex-col justify-between h-24 md:h-40 bg-[var(--fg)] text-[var(--bg)] transition-colors duration-300">
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-40">Rata-rata Progres</p>
          <h3 className="text-2xl md:text-6xl font-black tracking-tighter leading-none">{(stats?.avgProgress || 0).toFixed(0)}%</h3>
        </div>
        <div className="p-4 md:p-8 flex flex-col justify-between h-24 md:h-40">
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Total Anggaran</p>
          <h3 className="text-sm md:text-4xl font-black tracking-tighter leading-none text-[var(--fg)]">Rp {(stats?.totalPagu / 1e9 || 0).toFixed(1)}M</h3>
        </div>
      </div>

      {/* Project List - Based on Image Layout */}
      <div className="max-w-6xl mx-auto py-8 md:py-12 px-4 md:px-8 space-y-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
          <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] md:tracking-[0.5em] opacity-30 text-[var(--fg)]">Proyek Sedang Berjalan</h2>
          
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 group-focus-within:opacity-100 transition-opacity text-[var(--fg)]" />
            <input 
              type="text"
              placeholder="CARI PROYEK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg)] border-2 border-[var(--muted-border)] focus:border-[var(--border)] px-12 py-3 text-[10px] font-black uppercase tracking-widest outline-none transition-all placeholder:opacity-20 text-[var(--fg)]"
            />
          </div>
        </div>
        
        <div className="space-y-12 md:space-y-24">
          {filteredProjects.map((p) => (
            <div key={p.id} className="aggressive-card group relative">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12 items-start">
                {/* Left Content */}
                <div className="lg:col-span-7 space-y-6 md:space-y-8">
                  <div className="space-y-2 md:space-y-4">
                    <h3 className="text-3xl md:text-6xl font-black tracking-tighter uppercase leading-none group-hover:text-[var(--bg)] transition-colors text-[var(--fg)]">
                      {p.nama_paket}
                    </h3>
                    <p className="text-sm md:text-lg leading-relaxed opacity-60 font-medium max-w-xl group-hover:text-[var(--bg)]/60 transition-colors text-[var(--fg)]">
                      {p.latestUpdate?.keterangan_kendala || "Proyek berjalan sesuai jadwal tanpa kendala signifikan di lapangan. Koordinasi antar bidang terus dilakukan untuk memastikan target tercapai."}
                    </p>
                  </div>

                  {/* Metadata Grid */}
                  <div className="flex flex-wrap gap-6 md:gap-12 items-center">
                    <div className="flex gap-3 md:gap-4 items-center">
                      <div className="vertical-line h-8 md:h-12 bg-[var(--fg)] group-hover:bg-[var(--bg)]" />
                      <div>
                        <p className="meta-label group-hover:text-[var(--bg)]/40">Bidang</p>
                        <p className="meta-value uppercase group-hover:text-[var(--bg)]">{p.nama_bidang}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 md:gap-4 items-center">
                      <div className="vertical-line h-8 md:h-12 bg-[var(--fg)] group-hover:bg-[var(--bg)]" />
                      <div>
                        <p className="meta-label group-hover:text-[var(--bg)]/40">Lokasi</p>
                        <p className="meta-value uppercase group-hover:text-[var(--bg)]">{p.lokasi_kab_kota}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 md:gap-4 items-center">
                      <div className="vertical-line h-8 md:h-12 bg-[var(--fg)] group-hover:bg-[var(--bg)]" />
                      <div>
                        <p className="meta-label group-hover:text-[var(--bg)]/40">Progres</p>
                        <p className="meta-value font-mono group-hover:text-[var(--bg)]">{p.latestUpdate?.fisik_kumulatif || 0}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar - Aggressive */}
                  <div className="w-full h-[1px] md:h-[2px] bg-[var(--muted-border)] group-hover:bg-[var(--bg)]/10 relative overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[var(--fg)] group-hover:bg-[var(--bg)] transition-all duration-1000 ease-out"
                      style={{ width: `${p.latestUpdate?.fisik_kumulatif || 0}%` }}
                    />
                  </div>
                </div>

                {/* Right Image/Visual */}
                <div className="lg:col-span-5 relative">
                  <div className="aspect-video lg:aspect-[4/3] bg-[var(--muted-border)] relative overflow-hidden border border-[var(--border)] group-hover:border-[var(--bg)] transition-colors">
                    <img 
                      src={`https://picsum.photos/seed/${p.id}/800/600`} 
                      alt={p.nama_paket}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    
                    {/* Action Link Overlay */}
                    <Link 
                      to={`/projects/${p.id}`}
                      className="absolute bottom-4 right-4 bg-[var(--bg)] text-[var(--fg)] px-4 py-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
                    >
                      Lihat Detail
                    </Link>
                  </div>
                </div>
              </div>
              {/* Mobile Link Overlay */}
              <Link to={`/projects/${p.id}`} className="absolute inset-0 lg:hidden z-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProjectModal = ({ 
  isOpen, 
  onClose, 
  onRefresh, 
  project = null 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onRefresh: () => void,
  project?: Project | null
}) => {
  const [bidang, setBidang] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    nama_paket: '',
    pagu: '',
    nilai_kontrak: '',
    tahun_anggaran: new Date().getFullYear(),
    bidang_id: '',
    lokasi_kab_kota: '',
    lat: '',
    long: '',
  });
  
  useEffect(() => {
    if (isOpen) {
      // Fetch bidang from Firestore
      const unsubscribe = onSnapshot(collection(db, 'bidang'), (snapshot) => {
        setBidang(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      if (project) {
        setFormData({
          nama_paket: project.nama_paket,
          pagu: project.pagu,
          nilai_kontrak: project.nilai_kontrak,
          tahun_anggaran: project.tahun_anggaran,
          bidang_id: project.bidang_id,
          lokasi_kab_kota: project.lokasi_kab_kota,
          lat: project.lat || '',
          long: project.long || '',
        });
      } else {
        setFormData({
          nama_paket: '',
          pagu: '',
          nilai_kontrak: '',
          tahun_anggaran: new Date().getFullYear(),
          bidang_id: '',
          lokasi_kab_kota: '',
          lat: '',
          long: '',
        });
      }
      return () => unsubscribe();
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        pagu: Number(formData.pagu),
        nilai_kontrak: Number(formData.nilai_kontrak),
        tahun_anggaran: Number(formData.tahun_anggaran),
        lat: formData.lat ? Number(formData.lat) : 0,
        long: formData.long ? Number(formData.long) : 0,
        status_verifikasi: project ? (project.status_verifikasi || 0) : 0,
        updated_at: serverTimestamp()
      };

      if (project) {
        await updateDoc(doc(db, 'projects', project.id as any), dataToSave);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...dataToSave,
          created_at: serverTimestamp()
        });
      }
      onRefresh();
      onClose();
    } catch (error) {
      handleFirestoreError(error, project ? 'update' : 'create', 'projects');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg)] w-full max-w-2xl p-6 md:p-12 space-y-8 border-4 border-[var(--border)] my-8">
        <div className="flex justify-between items-center">
          <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--fg)]">
            {project ? 'Edit Proyek' : 'Tambah Proyek Baru'}
          </h3>
          <button onClick={onClose} className="text-2xl font-black text-[var(--fg)]">✕</button>
        </div>
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8" onSubmit={handleSubmit}>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Nama Paket Pekerjaan</label>
            <input 
              name="nama_paket" 
              value={formData.nama_paket}
              onChange={handleChange}
              required 
              className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Pagu Anggaran (Rp)</label>
            <input 
              name="pagu" 
              type="number" 
              value={formData.pagu}
              onChange={handleChange}
              required 
              className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Nilai Kontrak (Rp)</label>
            <input 
              name="nilai_kontrak" 
              type="number" 
              value={formData.nilai_kontrak}
              onChange={handleChange}
              required 
              className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Tahun Anggaran</label>
            <input 
              name="tahun_anggaran" 
              type="number" 
              value={formData.tahun_anggaran}
              onChange={handleChange}
              required 
              className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Bidang</label>
            <select 
              name="bidang_id" 
              value={formData.bidang_id}
              onChange={handleChange}
              required 
              className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)] appearance-none"
            >
              <option value="">Pilih Bidang</option>
              {bidang.map(b => (
                <option key={b.id} value={b.id}>{b.nama_bidang}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Lokasi (Kab/Kota)</label>
            <select 
              name="lokasi_kab_kota" 
              value={formData.lokasi_kab_kota}
              onChange={handleChange}
              required 
              className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)] appearance-none"
            >
              <option value="">Pilih Kabupaten/Kota</option>
              {KAB_KOTA_KEPRI.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Latitude</label>
            <input 
              name="lat" 
              type="number" 
              step="any" 
              value={formData.lat}
              onChange={handleChange}
              className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Longitude</label>
            <input 
              name="long" 
              type="number" 
              step="any" 
              value={formData.long}
              onChange={handleChange}
              className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" 
            />
          </div>
          <button type="submit" className="sm:col-span-2 bg-[var(--fg)] text-[var(--bg)] py-6 font-black uppercase tracking-widest hover:bg-[var(--bg)] hover:text-[var(--fg)] border-2 border-[var(--border)] transition-all">
            Simpan Proyek
          </button>
        </form>
      </div>
    </div>
  );
};

const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { user } = useAuth();
  const [modalState, setModalState] = useState<{ isOpen: boolean, project: Project | null }>({
    isOpen: false,
    project: null
  });
  const navigate = useNavigate();

  const fetchProjects = () => {
    let q = query(collection(db, 'projects'));
    
    // Filter by bidang for operator/kabid
    if ((user?.role === 'operator' || user?.role === 'kabid') && user?.bidang_id) {
      q = query(collection(db, 'projects'), where('bidang_id', '==', user.bidang_id));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Fetch bidang names map
      const bSnap = await getDocs(collection(db, 'bidang'));
      const bMap: any = {};
      bSnap.docs.forEach(d => bMap[d.id] = d.data().nama_bidang);

      const projectsData = await Promise.all(snapshot.docs.map(async (pDoc) => {
        const pId = pDoc.id;
        const pData = pDoc.data();
        const qUpdate = query(collection(db, 'projects', pId, 'updates'), orderBy('created_at', 'desc'), limit(1));
        const uSnap = await getDocs(qUpdate);
        return { 
          id: pId, 
          ...pData,
          nama_bidang: bMap[pData.bidang_id] || 'SDA',
          latestUpdate: uSnap.docs[0]?.data() || null 
        } as unknown as Project;
      }));
      setProjects(projectsData);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchProjects();
    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus proyek ini? Seluruh riwayat update juga akan dihapus.')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (error) {
        handleFirestoreError(error, 'delete', `projects/${id}`);
      }
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8 md:space-y-12 pb-24 md:pb-12 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-4 border-[var(--border)] pb-6 md:pb-8 gap-4">
        <div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none text-[var(--fg)]">Proyek</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 mt-2 text-[var(--fg)]">Daftar Strategis Pembangunan</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'operator') && (
          <button 
            onClick={() => setModalState({ isOpen: true, project: null })}
            className="w-full sm:w-auto bg-[var(--fg)] text-[var(--bg)] px-8 py-4 font-black uppercase tracking-widest text-xs hover:bg-[var(--bg)] hover:text-[var(--fg)] border border-[var(--border)] transition-all"
          >
            Tambah Proyek +
          </button>
        )}
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto border-2 border-[var(--border)]">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-[var(--fg)] text-[var(--bg)]">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest w-16 text-center">No</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest">Paket Pekerjaan</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest">Bidang</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest">Lokasi</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Anggaran</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {projects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p, index) => (
              <tr key={p.id} className="group hover:bg-[var(--fg)]/5 transition-all duration-300">
                <td className="p-6 text-center font-black text-[var(--fg)] opacity-40">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                <td className="p-6 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                  <p className="text-lg font-black uppercase tracking-tight text-[var(--fg)]">{p.nama_paket}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-[var(--fg)]">TA {p.tahun_anggaran}</p>
                </td>
                <td className="p-6">
                  <span className="text-[10px] font-black uppercase tracking-widest border border-[var(--border)] px-3 py-1 text-[var(--fg)]">
                    {p.nama_bidang}
                  </span>
                </td>
                <td className="p-6 text-xs font-bold uppercase tracking-widest opacity-60 text-[var(--fg)]">
                  {p.lokasi_kab_kota}
                </td>
                <td className="p-6 text-right">
                  <p className="text-lg font-black text-[var(--fg)]">Rp {p.pagu.toLocaleString('id-ID')}</p>
                </td>
                <td className="p-6">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="p-2 border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all"
                      title="Lihat"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {(user?.role === 'admin' || user?.role === 'operator') && (
                      <>
                        <button 
                          onClick={() => setModalState({ isOpen: true, project: p })}
                          className="p-2 border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {projects.length > itemsPerPage && (
        <div className="flex justify-center items-center gap-4 py-8">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-6 py-3 border-2 border-[var(--border)] font-black uppercase text-xs tracking-widest disabled:opacity-20 hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all"
          >
            Kembali
          </button>
          <div className="font-black uppercase text-xs tracking-widest text-[var(--fg)]">
            Halaman {currentPage} dari {Math.ceil(projects.length / itemsPerPage)}
          </div>
          <button 
            disabled={currentPage === Math.ceil(projects.length / itemsPerPage)}
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(projects.length / itemsPerPage), prev + 1))}
            className="px-6 py-3 border-2 border-[var(--border)] font-black uppercase text-xs tracking-widest disabled:opacity-20 hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all"
          >
            Selanjutnya
          </button>
        </div>
      )}

      <ProjectModal 
        isOpen={modalState.isOpen} 
        project={modalState.project}
        onClose={() => setModalState({ isOpen: false, project: null })} 
        onRefresh={fetchProjects}
      />
    </div>
  );
};

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const { user } = useAuth();
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchProject = () => {
    const unsubProject = onSnapshot(doc(db, 'projects', id!), (docSnap) => {
      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() };
        
        // Fetch updates subcollection
        const qUpdates = query(collection(db, 'projects', id!, 'updates'), orderBy('fisik_kumulatif', 'desc'));
        onSnapshot(qUpdates, (updateSnap) => {
          const updates = updateSnap.docs.map(u => ({ id: u.id, ...u.data() }));
          setProject({ ...projectData, updates, photos: [] }); // Simplified photos for now
        });
      }
    });
    return unsubProject;
  };

  useEffect(() => {
    const unsub = fetchProject();
    return () => unsub();
  }, [id]);

  if (!project) return <div className="p-12 text-center font-black uppercase tracking-widest text-[var(--fg)] transition-colors duration-300">Memuat...</div>;

  const latestUpdate = project.updates[0];

  return (
    <div className="bg-[var(--bg)] min-h-full pb-24 md:pb-0 transition-colors duration-300">
      {/* Full Width Carousel */}
      {project.photos && project.photos.length > 0 && (
        <div className="relative w-full bg-black overflow-hidden border-b border-[var(--border)] group cursor-zoom-in h-[50vh] md:h-[70vh] lg:h-[80vh]">
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentPhotoIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              src={`/${project.photos[currentPhotoIndex].foto_path}`} 
              alt={`Dokumentasi ${currentPhotoIndex + 1}`}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onClick={() => {
                setSelectedImage(`/${project.photos[currentPhotoIndex].foto_path}`);
                setShowImageModal(true);
              }}
            />
          </AnimatePresence>
          
          {/* Carousel Controls */}
          {project.photos.length > 1 && (
            <>
              <div className="absolute inset-0 flex items-center justify-between px-4 md:px-8 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex((prev) => (prev === 0 ? project.photos.length - 1 : prev - 1));
                  }}
                  className="bg-white text-black w-10 h-10 md:w-16 md:h-16 flex items-center justify-center font-black text-xl border-2 border-black hover:bg-black hover:text-white transition-all shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]"
                >
                  ←
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex((prev) => (prev === project.photos.length - 1 ? 0 : prev + 1));
                  }}
                  className="bg-white text-black w-10 h-10 md:w-16 md:h-16 flex items-center justify-center font-black text-xl border-2 border-black hover:bg-black hover:text-white transition-all shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]"
                >
                  →
                </button>
              </div>
              
              {/* Indicators */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {project.photos.map((_: any, idx: number) => (
                  <button 
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(idx);
                    }}
                    className={cn(
                      "w-2 h-2 md:w-3 md:h-3 border border-white transition-all",
                      idx === currentPhotoIndex ? "bg-white scale-125 shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]" : "bg-white/20"
                    )}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Photo Label Overlay */}
          <div className="absolute bottom-6 left-6 md:left-12 z-10">
            <span className="bg-black text-white px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] border border-white/20 shadow-[4px_4px_0_0_rgba(255,255,255,0.1)]">
              Dokumentasi: {project.photos[currentPhotoIndex].label}
            </span>
          </div>
        </div>
      )}

      {/* Detail Header */}
      <div className="border-b border-[var(--border)] p-6 md:p-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4">
            <Link to="/projects" className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity text-[var(--fg)]">← Kembali ke Daftar</Link>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none text-[var(--fg)]">{project.nama_paket}</h2>
            <div className="flex flex-wrap gap-4 md:gap-6 items-center">
              <span className="text-[10px] font-black uppercase tracking-widest bg-[var(--fg)] text-[var(--bg)] px-3 py-1">{project.nama_bidang}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">{project.lokasi_kab_kota}</span>
            </div>
          </div>
          {user?.role === 'operator' && (
            <button 
              onClick={() => setShowUpdateForm(true)}
              className="w-full md:w-auto bg-[var(--fg)] text-[var(--bg)] px-8 py-4 font-black uppercase tracking-widest text-xs hover:bg-[var(--bg)] hover:text-[var(--fg)] border border-[var(--border)] transition-all"
            >
              Perbarui Progres
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8 md:space-y-12">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--border)] border border-[var(--border)]">
            <div className="bg-[var(--bg)] p-6 md:p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Progres Fisik</p>
              <p className="text-5xl md:text-7xl font-black tracking-tighter text-[var(--fg)]">{latestUpdate?.fisik_kumulatif || 0}%</p>
              <div className="w-full h-1 bg-[var(--muted-border)]">
                <div className="h-full bg-[var(--fg)]" style={{ width: `${latestUpdate?.fisik_kumulatif || 0}%` }} />
              </div>
            </div>
            <div className="bg-[var(--bg)] p-6 md:p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Status Keuangan</p>
              <p className="text-2xl md:text-3xl font-black tracking-tight text-[var(--fg)]">Rp {(latestUpdate?.keuangan_nominal || 0).toLocaleString('id-ID')}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Termin {latestUpdate?.termin_ke || 0}</p>
            </div>
          </div>

          {/* History */}
          <div className="space-y-8">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 text-[var(--fg)]">Riwayat Pembaruan</h3>
            <div className="space-y-0 border-t border-[var(--border)]">
              {project.updates.map((up: any) => (
                <div key={up.id} className="py-6 md:py-8 border-b border-[var(--border)] flex flex-col sm:flex-row justify-between items-start group hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all px-4 gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-black uppercase tracking-widest">{format(new Date(up.created_at), 'dd MMM yyyy')}</p>
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 font-black uppercase tracking-widest border",
                        up.status_verifikasi === 1 ? "border-[var(--border)] group-hover:border-[var(--bg)]" : 
                        up.status_verifikasi === 2 ? "border-red-500 text-red-500" : "border-[var(--muted-border)] opacity-40"
                      )}>
                        {up.status_verifikasi === 1 ? "Terverifikasi" : up.status_verifikasi === 2 ? "Ditolak" : "Menunggu"}
                      </span>
                    </div>
                    <p className="text-sm font-medium opacity-60 max-w-xl">{up.keterangan_kendala || 'Tidak ada kendala yang dilaporkan untuk periode ini.'}</p>
                  </div>
                  <div className="text-left sm:text-right space-y-4 w-full sm:w-auto">
                    <p className="text-3xl md:text-3xl font-black tracking-tighter">{up.fisik_kumulatif}%</p>
                    {user?.role === 'kabid' && up.status_verifikasi === 0 && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleVerify(up.id, 1)}
                          className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest border border-[var(--border)] px-4 py-2 hover:bg-[var(--bg)] hover:text-[var(--fg)] transition-all"
                        >
                          Setujui
                        </button>
                        <button 
                          onClick={() => handleVerify(up.id, 2)}
                          className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest border border-red-500 text-red-500 px-4 py-2 hover:bg-red-500 hover:text-white transition-all"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="border border-[var(--border)] p-6 md:p-8 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--fg)]">Informasi Kontrak</h3>
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Pagu Anggaran</p>
                <p className="text-xl font-black text-[var(--fg)]">Rp {project.pagu.toLocaleString('id-ID')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Nilai Kontrak</p>
                <p className="text-xl font-black text-[var(--fg)]">Rp {project.nilai_kontrak.toLocaleString('id-ID')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Tahun Anggaran</p>
                <p className="text-xl font-black text-[var(--fg)]">{project.tahun_anggaran}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
          onClick={() => setShowImageModal(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white text-4xl font-black hover:scale-110 transition-transform z-[210]"
            onClick={() => setShowImageModal(false)}
          >
            ✕
          </button>
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img 
              src={selectedImage} 
              alt="Tampilan penuh" 
              className="max-w-full max-h-[90vh] object-contain border-4 border-white/10 shadow-2xl"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-12 left-0 right-0 text-center">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em]">Tampilan Sesuai Rasio Asli</p>
            </div>
          </div>
        </div>
      )}

      {showUpdateForm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg)] w-full max-w-2xl p-6 md:p-12 space-y-8 border-4 border-[var(--border)] my-8">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--fg)]">Pembaruan Baru</h3>
              <button onClick={() => setShowUpdateForm(false)} className="text-2xl font-black text-[var(--fg)]">✕</button>
            </div>
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8" onSubmit={async (e) => {
              e.preventDefault();
              const fData = new FormData(e.currentTarget);
              try {
                const updateData = {
                  project_id: id!,
                  fisik_kumulatif: Number(fData.get('fisik_kumulatif')),
                  keuangan_nominal: Number(fData.get('keuangan_nominal')),
                  termin_ke: Number(fData.get('termin_ke')),
                  keterangan_kendala: fData.get('keterangan_kendala'),
                  status_verifikasi: 0,
                  created_at: serverTimestamp()
                };
                
                await addDoc(collection(db, 'projects', id!, 'updates'), updateData);
                setShowUpdateForm(false);
              } catch (error) {
                handleFirestoreError(error, 'create', `projects/${id}/updates`);
              }
            }}>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Progres Fisik (%)</label>
                <input name="fisik_kumulatif" type="number" step="0.1" required className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Nominal Keuangan (Rp)</label>
                <input name="keuangan_nominal" type="number" required className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">No. Termin</label>
                <input name="termin_ke" type="number" required className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-black text-xl outline-none focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Foto-foto</label>
                <input name="photos" type="file" multiple className="w-full text-[10px] font-black uppercase text-[var(--fg)]" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--fg)]">Kendala</label>
                <textarea name="keterangan_kendala" className="w-full px-4 py-4 bg-[var(--bg)] border-2 border-[var(--border)] font-medium outline-none h-32 focus:bg-[var(--fg)] focus:text-[var(--bg)] transition-all text-[var(--fg)]" />
              </div>
              <button type="submit" className="sm:col-span-2 bg-[var(--fg)] text-[var(--bg)] py-6 font-black uppercase tracking-widest hover:bg-[var(--bg)] hover:text-[var(--fg)] border-2 border-[var(--border)] transition-all">
                Kirim Laporan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  async function handleVerify(progressId: string, status: number) {
    if (confirm(`Apakah Anda yakin ingin ${status === 1 ? 'menyetujui' : 'menolak'} laporan ini?`)) {
      try {
        await updateDoc(doc(db, 'projects', id!, 'updates', progressId), {
          status_verifikasi: status,
          verified_at: serverTimestamp(),
          verified_by: user?.id
        });
      } catch (error) {
        handleFirestoreError(error, 'update', `projects/${id}/updates/${progressId}`);
      }
    }
  }
};

const Tutorial = () => {
  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-12 md:space-y-16 transition-colors duration-300">
      <div className="border-b-4 border-[var(--border)] pb-8">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none text-[var(--fg)]">Panduan Penggunaan</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 mt-3 text-[var(--fg)]">E-MON BIMA KEPRI v1.0</p>
      </div>

      <div className="space-y-16">
        {/* Step 1: Tambah Proyek */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-[var(--fg)] text-[var(--bg)] w-10 h-10 flex items-center justify-center font-black text-xl">1</div>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--fg)]">Menambahkan Proyek Baru</h3>
          </div>
          <div className="border-l-4 border-[var(--border)] pl-6 space-y-4">
            <p className="text-[var(--fg)] opacity-70 leading-relaxed font-medium">
              Langkah ini digunakan oleh Administrator atau Operator untuk mendaftarkan paket pekerjaan baru ke dalam sistem.
            </p>
            <ul className="space-y-3">
              {[
                "Navigasi ke menu 'Proyek' di sidebar.",
                "Klik tombol 'Tambah Proyek +' di sudut kanan atas halaman.",
                "Isi formulir dengan lengkap: Nama Paket, Pagu Anggaran, Nilai Kontrak, dan Tahun Anggaran.",
                "Pilih 'Bidang' yang bertanggung jawab atas proyek tersebut.",
                "Pilih 'Kabupaten/Kota' dari menu dropdown lokasi.",
                "Masukkan koordinat Latitude & Longitude jika tersedia.",
                "Klik 'Simpan Proyek' untuk mendaftarkan proyek ke database."
              ].map((text, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <PlusCircle className="w-4 h-4 mt-1 shrink-0 text-[var(--fg)]" />
                  <span className="text-sm font-bold text-[var(--fg)]">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Step 2: Edit & Delete */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-[var(--fg)] text-[var(--bg)] w-10 h-10 flex items-center justify-center font-black text-xl">2</div>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--fg)]">Mengelola Daftar Proyek</h3>
          </div>
          <div className="border-l-4 border-[var(--border)] pl-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-[var(--fg)]" />
                  <h4 className="font-black uppercase text-xs tracking-widest text-[var(--fg)]">Edit Proyek</h4>
                </div>
                <p className="text-sm text-[var(--fg)] opacity-70">Klik ikon pensil di kolom 'Aksi' pada tabel proyek. Anda dapat memperbarui informasi dasar proyek jika terjadi kesalahan input atau perubahan kontrak.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-500">
                  <Trash2 className="w-5 h-5" />
                  <h4 className="font-black uppercase text-xs tracking-widest">Hapus Proyek</h4>
                </div>
                <p className="text-sm text-[var(--fg)] opacity-70">Klik ikon tempat sampah merah untuk menghapus proyek. PERINGATAN: Menghapus proyek akan menghapus seluruh riwayat pembaruan progres yang terkait secara permanen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Progress Updates */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-[var(--fg)] text-[var(--bg)] w-10 h-10 flex items-center justify-center font-black text-xl">3</div>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--fg)]">Melaporkan Progres Proyek</h3>
          </div>
          <div className="border-l-4 border-[var(--border)] pl-6 space-y-4">
            <p className="text-[var(--fg)] opacity-70 leading-relaxed font-medium">
              Operator Bidang berkewajiban melakukan pembaruan data secara berkala untuk setiap proyek.
            </p>
            <ul className="space-y-3">
              {[
                "Buka halaman detail proyek dengan mengeklik Nama Proyek atau ikon mata di daftar proyek.",
                "Klik tombol 'Perbarui Progres' (Hanya tersedia untuk role Operator).",
                "Update Fisik: Masukkan persentase kemajuan fisik kumulatif (0-100%).",
                "Update Keuangan: Masukkan nominal penyerapan anggaran terbaru.",
                "Pilih Termin ke-berapa laporan ini diajukan.",
                "Unggah Foto: Pilih file foto dokumentasi lapangan sebagai bukti fisik.",
                "Tambahkan keterangan kendala jika ada masalah di lapangan.",
                "Klik 'Kirim Laporan' untuk menunggu verifikasi dari Kepala Bidang."
              ].map((text, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-4 h-4 mt-1 shrink-0 text-[var(--fg)]" />
                  <span className="text-sm font-bold text-[var(--fg)]">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Step 4: Verification */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-[var(--fg)] text-[var(--bg)] w-10 h-10 flex items-center justify-center font-black text-xl">4</div>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--fg)]">Verifikasi oleh Kepala Bidang</h3>
          </div>
          <div className="border-l-4 border-[var(--border)] pl-6 space-y-4">
            <p className="text-[var(--fg)] opacity-70 leading-relaxed font-medium">
              Kepala Bidang (Kabid) bertanggung jawab memvalidasi setiap laporan progres yang masuk sebelum dipublikasikan ke Dashboard utama.
            </p>
            <ul className="space-y-3">
              {[
                "Login menggunakan akun Kepala Bidang.",
                "Masuk ke halaman detail proyek yang ingin diverifikasi.",
                "Scroll ke bagian 'Riwayat Pembaruan'.",
                "Laporan yang belum diverifikasi akan memiliki tombol 'Setujui' (Hijau) dan 'Tolak' (Merah).",
                "Klik 'Setujui' jika data fisik, keuangan, dan dokumentasi foto sudah sesuai.",
                "Klik 'Tolak' jika terdapat ketidaksesuaian data atau dokumentasi tidak valid.",
                "Laporan yang disetujui akan otomatis memperbarui progres kumulatif proyek di Dashboard."
              ].map((text, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <ShieldCheck className="w-4 h-4 mt-1 shrink-0 text-[var(--fg)]" />
                  <span className="text-sm font-bold text-[var(--fg)]">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="bg-[var(--fg)] text-[var(--bg)] p-8 md:p-12 space-y-4">
        <h4 className="text-xl font-black uppercase tracking-widest">Penting: Verifikasi Laporan</h4>
        <p className="text-sm opacity-70 leading-relaxed font-medium italic">
          Setiap laporan progres yang dikirim oleh Operator tidak akan langsung dihitung dalam statistik dashboard. Laporan harus diverifikasi terlebih dahulu oleh Kepala Bidang (Kabid) untuk memastikan validitas data dan dokumentasi.
        </p>
      </div>
    </div>
  );
};

const LoginScreen = () => {
  const { login } = useAuth();
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 transition-colors duration-300">
      <div className="bg-white p-16 w-full max-w-md space-y-12 text-center border-[12px] border-white/10">
        <div className="space-y-4">
          <div className="bg-black w-20 h-20 flex items-center justify-center mx-auto mb-8">
            <LayoutDashboard className="text-white w-10 h-10" />
          </div>
          <h2 className="text-7xl font-black tracking-tighter uppercase leading-none text-black">E-MON</h2>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">BIMA KEPRI</p>
        </div>
        
        <div className="space-y-2">
          {(['operator', 'kabid', 'kadis', 'admin'] as Role[]).map(role => (
            <button 
              key={role}
              onClick={() => login(role)}
              className="w-full py-5 px-8 bg-white hover:bg-black text-black hover:text-white border-2 border-black font-black uppercase tracking-widest text-xs transition-all flex items-center justify-between group"
            >
              {role === 'admin' ? 'Administrator' : 
               role === 'operator' ? 'Operator Bidang' : 
               role === 'kabid' ? 'Kepala Bidang' : 'Kepala Dinas'}
              <PlusCircle className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
        
        <p className="text-[9px] font-black uppercase tracking-widest opacity-30 leading-loose text-black">
          Dinas Pekerjaan Umum dan Penataan Ruang<br/>Provinsi Kepulauan Riau
        </p>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AuthContext.Consumer>
            {auth => !auth?.user ? <LoginScreen /> : (
              <div className="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors duration-300">
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/projects" element={<ProjectList />} />
                      <Route path="/projects/:id" element={<ProjectDetail />} />
                      <Route path="/tutorial" element={<Tutorial />} />
                    </Routes>
                  </main>
                </div>
                <MobileNav />
              </div>
            )}
          </AuthContext.Consumer>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
