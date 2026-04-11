import * as React from 'react';
import { useState, useEffect, Component } from 'react';
import { 
  Calendar, 
  Plus, 
  BarChart3, 
  Bell,
  ClipboardList, 
  User, 
  MapPin, 
  Clock, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeftRight,
  MoreVertical,
  ArrowLeft,
  Info,
  X,
  Settings,
  Shield,
  TrendingUp,
  AlarmClock,
  Briefcase,
  Building2,
  Map,
  Trash2,
  Edit,
  FileText,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Shift } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getDoc, setDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import LoginScreen from './components/LoginScreen';
import ProfileScreen from './components/ProfileScreen';

// --- Brazilian Holidays Helper ---
const getBrazilianHolidays = (year: number, month: number) => {
  const holidays: { day: number, name: string }[] = [];
  
  // Static holidays (month is 0-indexed)
  const staticHolidays: Record<string, string> = {
    '0-1': 'Confraternização Universal',
    '3-21': 'Tiradentes',
    '4-1': 'Dia do Trabalhador',
    '8-7': 'Independência do Brasil',
    '9-12': 'Nossa Senhora Aparecida',
    '10-2': 'Finados',
    '10-15': 'Proclamação da República',
    '10-20': 'Dia da Consciência Negra',
    '11-25': 'Natal'
  };

  Object.entries(staticHolidays).forEach(([mDay, name]) => {
    const [m, d] = mDay.split('-').map(Number);
    if (m === month) {
      holidays.push({ day: d, name });
    }
  });

  // Mobile holidays (Easter based)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monthEaster = Math.floor((h + l - 7 * m + 114) / 31);
  const dayEaster = ((h + l - 7 * m + 114) % 31) + 1;
  
  const easterDate = new Date(year, monthEaster - 1, dayEaster);
  
  const addHoliday = (date: Date, name: string) => {
    if (date.getMonth() === month) {
      holidays.push({ day: date.getDate(), name });
    }
  };

  // Carnaval: 47 days before Easter
  const carnaval = new Date(easterDate);
  carnaval.setDate(easterDate.getDate() - 47);
  addHoliday(carnaval, 'Carnaval');

  // Sexta-feira Santa: 2 days before Easter
  const sextaSanta = new Date(easterDate);
  sextaSanta.setDate(easterDate.getDate() - 2);
  addHoliday(sextaSanta, 'Sexta-feira Santa');

  // Corpus Christi: 60 days after Easter
  const corpusChristi = new Date(easterDate);
  corpusChristi.setDate(easterDate.getDate() + 60);
  addHoliday(corpusChristi, 'Corpus Christi');

  return holidays.sort((a, b) => a.day - b.day);
};

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Ocorreu um erro inesperado.";
      try {
        const errInfo = JSON.parse(this.state.error?.message || "");
        if (errInfo.error && errInfo.error.includes("insufficient permissions")) {
          message = "Você não tem permissão para realizar esta operação. Verifique se você está logado corretamente.";
        }
      } catch (e) {
        // Not a JSON error info
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-light dark:bg-dark p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-secondary/10 p-8 rounded-3xl shadow-xl border border-light/30 dark:border-secondary/20">
            <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-primary dark:text-white mb-4">Ops! Algo deu errado</h2>
            <p className="text-slate mb-8">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all active:scale-95"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Constants ---
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// --- Helper Functions ---
const calculateIsWorkday = (date: Date, anchorDate: Date | null, pattern: string, customWorkDays: number, customOffDays: number) => {
  if (!anchorDate || isNaN(anchorDate.getTime())) return false;
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  const anchor = new Date(anchorDate);
  anchor.setHours(0, 0, 0, 0);
  
  const diffTime = checkDate.getTime() - anchor.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (pattern === '12X36') {
    return (((diffDays % 2) + 2) % 2) === 0;
  } else if (pattern === '1X3') {
    return diffDays % 4 === 0;
  } else if (pattern === '2X6') {
    const cycleDay = ((diffDays % 8) + 8) % 8;
    return cycleDay === 0 || cycleDay === 1;
  } else if (pattern === 'custom') {
    const cycle = customWorkDays + customOffDays;
    if (cycle === 0) return false;
    const cycleDay = ((diffDays % cycle) + cycle) % cycle;
    return cycleDay < customWorkDays;
  }
  return false;
};

// --- Mock Data ---
const MOCK_SHIFTS: Shift[] = [
  {
    id: '1',
    hospital: 'Delegacia Central',
    location: 'Setor Alfa',
    startTime: '19:00',
    endTime: '07:00',
    date: new Date().toISOString(),
    type: 'Normal',
    sector: 'Patrulha Urbana'
  },
  {
    id: '2',
    hospital: 'Unidade de Choque',
    location: 'Base Operacional',
    startTime: '07:00',
    endTime: '19:00',
    date: '2026-03-13T00:00:00.000Z',
    type: 'Extra',
    sector: 'Operações Especiais'
  }
];

// --- Components ---


const Header = ({ title, showBack = false, onBack, onMenu, user, isOffline, isSyncing }: { title: string, showBack?: boolean, onBack?: () => void, onMenu?: () => void, user: FirebaseUser | null, isOffline?: boolean, isSyncing?: boolean }) => (
  <header className="sticky top-0 z-40 bg-white dark:bg-dark border-b border-slate-200 dark:border-slate-800 shadow-sm pt-safe">
    <div className="flex justify-between items-center w-full px-6 md:px-8 h-20 md:h-24">
      <div className="flex items-center gap-2 md:gap-4 z-10">
        <button onClick={onMenu} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400">
          <Menu size={24} className="md:w-7 md:h-7" />
        </button>
        {showBack && (
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={22} className="md:w-6 md:h-6 text-slate-600 dark:text-slate-400" />
          </button>
        )}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="w-12 h-12 md:w-20 md:h-20 flex items-center justify-center">
            <img 
              src="/logo-plantao.png" 
              alt="Logo Plantão Pro" 
              className="w-full h-full object-contain contrast-[1.1] brightness-[1.05]"
              referrerPolicy="no-referrer"
              onClick={() => window.location.reload()}
            />
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline font-black text-lg md:text-xl tracking-tight text-slate-900 dark:text-white leading-none">PLANTÃO PRO</h1>
            <div className="flex items-center gap-2 mt-1">
              {isOffline ? (
                <WifiOff size={12} className="text-red-500" />
              ) : isSyncing ? (
                <RefreshCw size={12} className="text-blue-500 animate-spin" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
);

const SideMenu = ({ isOpen, onClose, onProfile, onAnnual, user }: { isOpen: boolean, onClose: () => void, onProfile: () => void, onAnnual: () => void, user: FirebaseUser | null }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 left-0 bottom-0 w-[280px] z-[70] bg-white dark:bg-[#020617] shadow-2xl flex flex-col pt-safe"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/logo-plantao.png" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="font-headline font-black text-xl text-primary tracking-tighter">Plantão Pro</span>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-secondary">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => { onAnnual(); onClose(); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 font-bold"
            >
              <Calendar size={22} className="text-primary" />
              <span>Visão Anual</span>
            </button>
            
            <button 
              onClick={() => { onProfile(); onClose(); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 font-bold"
            >
              <User size={22} className="text-primary" />
              <span>Perfil e Configurações</span>
            </button>
          </div>
          
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <img src={user.photoURL || "https://picsum.photos/seed/officer/100/100"} className="w-10 h-10 rounded-full border border-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{user.displayName}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{user.email}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 text-slate-400">
                  <User size={24} />
                  <span className="text-sm font-bold italic">Modo Visitante</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// --- Screens ---


const CalendarScreen = ({ 
  selectedPattern, 
  setSelectedPattern, 
  anchorDate,
  setAnchorDate,
  manualShifts,
  setManualShifts,
  customWorkDays,
  setCustomWorkDays,
  customOffDays,
  setCustomOffDays,
  hasCustomPattern,
  setHasCustomPattern,
  extraLocations,
  setSelectedShiftForAlert,
  handleNavigate,
  normalDayColor,
  setNormalDayColor
}: {
  selectedPattern: '12X36' | '1X3' | '2X6' | 'custom';
  setSelectedPattern: React.Dispatch<React.SetStateAction<'12X36' | '1X3' | '2X6' | 'custom'>>;
  anchorDate: Date | null;
  setAnchorDate: React.Dispatch<React.SetStateAction<Date | null>>;
  manualShifts: Record<string, { type: 'Normal' | 'Extra' | 'Folga', color?: string, location?: string, duration?: '12h' | '24h', info?: string, start?: string, end?: string }>;
  setManualShifts: React.Dispatch<React.SetStateAction<Record<string, { type: 'Normal' | 'Extra' | 'Folga', color?: string, location?: string, duration?: '12h' | '24h', info?: string, start?: string, end?: string }>>>;
  customWorkDays: number;
  setCustomWorkDays: React.Dispatch<React.SetStateAction<number>>;
  customOffDays: number;
  setCustomOffDays: React.Dispatch<React.SetStateAction<number>>;
  hasCustomPattern: boolean;
  setHasCustomPattern: React.Dispatch<React.SetStateAction<boolean>>;
  extraLocations: string[];
  setSelectedShiftForAlert: (shift: { date: string, location: string, startTime: string, endTime: string, type: string } | null) => void;
  handleNavigate: (screen: string) => void;
  normalDayColor: string;
  setNormalDayColor: (color: string) => void;
}) => {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayOptionsOpen, setIsDayOptionsOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    type: 'Normal' as 'Normal' | 'Extra' | 'Folga',
    start: '07:00',
    end: '19:00',
    location: '',
    color: 'bg-blue-400',
    duration: '12h' as '12h' | '24h',
    date: '',
    isStartOfScale: false,
    info: ''
  });

  const shiftColors = [
    { name: 'Laranja', value: 'bg-primary' },
    { name: 'Azul', value: 'bg-secondary' },
    { name: 'Amarelo', value: 'bg-warning' },
    { name: 'Verde', value: 'bg-success' },
    { name: 'Índigo', value: 'bg-indigo-600' },
    { name: 'Vermelho', value: 'bg-red-500' },
    { name: 'Cinza', value: 'bg-slate-500' },
    { name: 'Esmeralda', value: 'bg-emerald-500' },
    { name: 'Roxo', value: 'bg-purple-500' },
    { name: 'Rosa', value: 'bg-pink-500' },
    { name: 'Ciano', value: 'bg-cyan-500' },
    { name: 'Preto', value: 'bg-slate-900' },
  ];

  const months = MONTHS;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const checkIsWorkday = (day: number) => {
    return calculateIsWorkday(
      new Date(currentYear, currentMonth, day),
      anchorDate,
      selectedPattern,
      customWorkDays,
      customOffDays
    );
  };

  const handleDayClick = (day: number) => {
    const isWorkday = checkIsWorkday(day);
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const manualShift = manualShifts[dateKey];
    
    if (selectedPattern !== 'custom' && !anchorDate) {
      setAnchorDate(new Date(currentYear, currentMonth, day));
    }
    
    if (selectedDay === day && isDayOptionsOpen) {
      setIsDayOptionsOpen(false);
    } else {
      setSelectedDay(day);
      setIsDayOptionsOpen(true);
    }
  };

  const handleEditDay = () => {
    const isWorkday = checkIsWorkday(selectedDay);
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const manualShift = manualShifts[dateKey];
    
    const isAnchor = anchorDate && 
                     anchorDate.getDate() === selectedDay && 
                     anchorDate.getMonth() === currentMonth && 
                     anchorDate.getFullYear() === currentYear;
    
    setModalData({
      type: manualShift ? manualShift.type : (isWorkday ? 'Normal' : 'Extra'),
      location: manualShift?.location || extraLocations[0] || '',
      color: manualShift?.color || (manualShift?.type === 'Extra' ? 'bg-warning' : (isWorkday ? normalDayColor : 'bg-warning')),
      date: dateKey,
      isStartOfScale: !!isAnchor,
      info: manualShift?.info || '',
      start: manualShift?.start || '07:00',
      end: manualShift?.end || '19:00'
    });
    setIsDayOptionsOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteDay = () => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setManualShifts(prev => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
    setIsDayOptionsOpen(false);
  };

  const handleSaveChanges = () => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const isWorkday = checkIsWorkday(selectedDay);
    
    if (modalData.isStartOfScale) {
      setAnchorDate(new Date(currentYear, currentMonth, selectedDay));
      if (modalData.type === 'Normal') {
        setNormalDayColor(modalData.color);
      }
    }
    
    // Determine if this is a "default" state that doesn't need a manual override
    const isDefaultNormal = modalData.type === 'Normal' && 
                            isWorkday && 
                            !modalData.info && 
                            modalData.start === '07:00' && 
                            modalData.end === '19:00' && 
                            modalData.color === normalDayColor;
                            
    const isDefaultFolga = modalData.type === 'Folga' && 
                           !isWorkday && 
                           !modalData.info;
    
    if (isDefaultNormal || isDefaultFolga) {
      setManualShifts(prev => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
    } else {
      setManualShifts(prev => ({
        ...prev,
        [dateKey]: {
          type: modalData.type,
          color: modalData.color,
          location: modalData.type === 'Extra' ? modalData.location : '',
          duration: modalData.type === 'Extra' ? modalData.duration : null,
          info: modalData.info,
          start: modalData.start,
          end: modalData.end
        }
      }));
    }
    
    setIsModalOpen(false);
  };

  const nextMonth = () => {
    setIsDayOptionsOpen(false);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    setIsDayOptionsOpen(false);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-32"
    >
      {/* Reset Scale Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-red-600 p-8 text-white">
                <h3 className="text-2xl font-black tracking-tight">Limpar Escala</h3>
                <p className="text-white/60 text-sm font-medium">Esta ação não pode ser desfeita</p>
              </div>
              
              <div className="p-8 space-y-6">
                <p className="text-slate-600 text-center font-medium">
                  Tem certeza que deseja limpar todos os dias da sua escala? A escala ficará vazia para você escolher uma nova data de início.
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsResetModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      setManualShifts({});
                      setAnchorDate(null);
                      setIsResetModalOpen(false);
                    }}
                    className="flex-1 py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                  >
                    Limpar Tudo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Scale Modal */}
      <AnimatePresence>
        {isCustomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-br from-primary-dark to-primary p-8 text-white">
                <h3 className="text-2xl font-black tracking-tight">Personalizar Escala</h3>
                <p className="text-white/60 text-sm font-medium">Defina seu ciclo de trabalho e folga</p>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sugestões Rápidas</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { w: 2, o: 5, label: '2X5' },
                      { w: 3, o: 6, label: '3X6' },
                      { w: 5, o: 2, label: '5X2' },
                      { w: 4, o: 2, label: '4X2' },
                    ].map(preset => (
                      <button 
                        key={preset.label}
                        onClick={() => {
                          setCustomWorkDays(preset.w);
                          setCustomOffDays(preset.o);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          customWorkDays === preset.w && customOffDays === preset.o
                            ? 'bg-secondary text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trabalho</label>
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <button 
                        onClick={() => setCustomWorkDays(Math.max(1, customWorkDays - 1))}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-secondary font-bold shadow-sm"
                      >
                        -
                      </button>
                      <span className="text-xl font-black text-slate-900">{customWorkDays}</span>
                      <button 
                        onClick={() => setCustomWorkDays(customWorkDays + 1)}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-secondary font-bold shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Folga</label>
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <button 
                        onClick={() => setCustomOffDays(Math.max(1, customOffDays - 1))}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-secondary font-bold shadow-sm"
                      >
                        -
                      </button>
                      <span className="text-xl font-black text-slate-900">{customOffDays}</span>
                      <button 
                        onClick={() => setCustomOffDays(customOffDays + 1)}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-secondary font-bold shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                  <p className="text-xs font-bold text-secondary">
                    Ciclo de {customWorkDays + customOffDays} dias: {customWorkDays} de serviço por {customOffDays} de folga.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsCustomModalOpen(false)}
                    className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      setHasCustomPattern(true);
                      setSelectedPattern('custom');
                      setIsCustomModalOpen(false);
                    }}
                    className="flex-1 py-4 px-6 bg-gradient-to-br from-primary-dark to-primary text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                  >
                    Salvar Escala
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-8 items-start mt-6">
        <aside className="w-full lg:w-96 shrink-0 space-y-8 order-2 lg:order-1">
          {/* Preenchimento Automático */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase">PREENCHIMENTO AUTOMÁTICO</h2>
            <div className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl flex w-full border border-slate-200 dark:border-slate-700 shadow-inner">
                <button 
                  onClick={() => setSelectedPattern('12X36')}
                  className={`flex-1 py-3 px-2 rounded-xl font-black text-xs transition-all duration-200 ${
                    selectedPattern === '12X36' 
                      ? 'bg-white dark:bg-slate-600 text-primary-dark dark:text-white shadow-md scale-[1.02]' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  12X36
                </button>
                <button 
                  onClick={() => setSelectedPattern('1X3')}
                  className={`flex-1 py-3 px-2 rounded-xl font-black text-xs transition-all duration-200 ${
                    selectedPattern === '1X3' 
                      ? 'bg-white dark:bg-slate-600 text-primary-dark dark:text-white shadow-md scale-[1.02]' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  1X3
                </button>
                <button 
                  onClick={() => setSelectedPattern('2X6')}
                  className={`flex-1 py-3 px-2 rounded-xl font-black text-xs transition-all duration-200 ${
                    selectedPattern === '2X6' 
                      ? 'bg-white dark:bg-slate-600 text-primary-dark dark:text-white shadow-md scale-[1.02]' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  2X6
                </button>
                {hasCustomPattern && (
                  <button 
                    onClick={() => setSelectedPattern('custom')}
                    className={`flex-1 py-3 px-2 rounded-xl font-black text-xs transition-all duration-200 ${
                      selectedPattern === 'custom' 
                        ? 'bg-white dark:bg-slate-600 text-primary-dark dark:text-white shadow-md scale-[1.02]' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {customWorkDays}X{customOffDays}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsCustomModalOpen(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 border border-transparent dark:border-slate-700`}
                >
                  <Settings size={16} />
                  Personalizar
                </button>
                <button 
                  onClick={() => setIsResetModalOpen(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 border border-transparent dark:border-red-900/20`}
                >
                  <Trash2 size={16} />
                  Limpar
                </button>
              </div>
            </div>
          </section>

          {/* Detalhes do Dia */}
          <section className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-l-4 border-primary-dark shadow-sm space-y-6 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-headline font-black text-xl text-slate-900 dark:text-white tracking-tight">Detalhes do Dia</h4>
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {selectedDay} {months[currentMonth]}
                </div>
              </div>
              
              <div className="min-h-[100px] p-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                {(() => {
                  const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                  const manualShift = manualShifts[dateKey];
                  const isWorkday = checkIsWorkday(selectedDay);
                  
                  const type = manualShift ? manualShift.type : (isWorkday ? 'Normal' : 'Folga');
                  const info = manualShift?.info;
                  const start = manualShift?.start || (type === 'Normal' ? '07:00' : '');
                  const end = manualShift?.end || (type === 'Normal' ? '19:00' : '');
                  const location = manualShift?.location;
                  
                  return (
                    <div className="space-y-4 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 ${
                          type === 'Normal' ? 'bg-primary/10 dark:bg-primary/20 text-secondary' : 
                          type === 'Extra' ? 'bg-warning/10 dark:bg-warning/20 text-warning' : 
                          'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${type === 'Normal' ? normalDayColor : type === 'Extra' ? 'bg-warning' : 'bg-slate-400'}`}></div>
                          <span className="text-[10px] font-black uppercase tracking-wider">{type}</span>
                        </div>

                        {(start && end) && (
                          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-center gap-2 shadow-sm">
                            <Clock size={12} className="text-secondary" />
                            <span className="text-[10px] font-bold tracking-tight">{start} - {end}</span>
                          </div>
                        )}

                        {type === 'Extra' && location && (
                          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-warning flex items-center gap-2 shadow-sm">
                            <MapPin size={12} />
                            <span className="text-[10px] font-bold tracking-tight">{location}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                            <FileText size={14} className="text-slate-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                            {info ? (
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {info}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Nenhuma observação.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>

          {/* Detalhes do Mês */}
          <section className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-l-4 border-secondary shadow-sm space-y-6 border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <h4 className="font-headline font-black text-xl text-slate-900 dark:text-white tracking-tight">Detalhes do Mês</h4>
              </div>
              
              <div className="space-y-4">
                {(() => {
                  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                  const monthExtras = Object.entries(manualShifts)
                    .filter(([date, shift]) => date.startsWith(monthPrefix) && shift.type === 'Extra')
                    .map(([date, shift]) => ({ date, ...shift }));

                  if (monthExtras.length === 0) {
                    return (
                      <p className="text-center text-slate-400 text-sm italic py-4">Nenhum serviço extra este mês</p>
                    );
                  }

                  // Group by location and color to avoid repetitions
                  const uniqueExtras = monthExtras.reduce((acc, current) => {
                    const location = current.location || 'Local não definido';
                    const color = current.color || 'bg-warning';
                    const key = `${location}-${color}`;
                    
                    if (!acc.find(item => `${item.location || 'Local não definido'}-${item.color || 'bg-warning'}` === key)) {
                      acc.push(current);
                    }
                    return acc;
                  }, [] as typeof monthExtras);

                  return uniqueExtras.map((extra, idx) => {
                    const colorClass = extra.color || 'bg-warning';
                    const textColorClass = colorClass.replace('bg-', 'text-');
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-10 rounded-full ${colorClass}`}></div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Local</span>
                            <p className={`text-sm font-black ${textColorClass}`}>
                              {extra.location || 'Local não definido'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duração</span>
                          <p className={`text-sm font-black ${textColorClass}`}>
                            {extra.duration || '12h'}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </section>
        </aside>

        <div className="flex-1 w-full space-y-8 order-1 lg:order-2">
          <section className="space-y-6">
            <div className="flex items-center justify-between relative h-12 mb-4">
              <button 
                onClick={prevMonth} 
                className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-secondary transition-colors z-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <h3 className="font-bold text-lg text-[#F59E0B] tracking-tight">
                  {months[currentMonth]} {currentYear}
                </h3>
              </div>
              <button 
                onClick={nextMonth} 
                className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-secondary transition-colors z-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentMonth}-${currentYear}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-visible"
              >
                <div className="grid grid-cols-7 text-center mb-2">
                  {weekDays.map(d => (
                    <span key={d} className="text-[#94A3B8] font-bold text-[10px] uppercase tracking-[0.1em]">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-[6px]">
                  {emptyDays.map(e => (
                    <div key={`empty-${e}`} className="aspect-square"></div>
                  ))}
                  {days.map(d => {
                    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const hasShift = checkIsWorkday(d);
                    const manualShift = manualShifts[dateKey];
                    const isSelected = d === selectedDay;
                    const isToday = now.getDate() === d && now.getMonth() === currentMonth && now.getFullYear() === currentYear;
                    const isAnchor = anchorDate && 
                                     anchorDate.getDate() === d && 
                                     anchorDate.getMonth() === currentMonth && 
                                     anchorDate.getFullYear() === currentYear;
                    
                    const isExtra = manualShift?.type === 'Extra';
                    const isFolga = manualShift?.type === 'Folga';
                    const isNormal = manualShift?.type === 'Normal' || (!manualShift && hasShift);
                    
                    let bgColor = '';
                    let textColor = 'text-slate-400 dark:text-slate-500';
                    
                    if (manualShift) {
                      if (isFolga) {
                        bgColor = 'bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700';
                        textColor = 'text-slate-400 dark:text-slate-500';
                      } else {
                        bgColor = manualShift.color || (isExtra ? 'bg-warning' : normalDayColor);
                        textColor = 'text-white';
                      }
                    } else if (hasShift) {
                      bgColor = normalDayColor;
                      textColor = 'text-white';
                    }

                    if (isToday && !bgColor) {
                      bgColor = 'bg-slate-100 dark:bg-slate-800';
                      textColor = 'text-slate-900 dark:text-white';
                    }
                    
                    return (
                      <div 
                        key={d} 
                        onClick={() => handleDayClick(d)}
                        className={`aspect-square flex flex-col items-center justify-center relative cursor-pointer transition-all hover:opacity-80 rounded-full ${bgColor} ${isSelected ? 'ring-2 ring-secondary ring-offset-2' : ''} ${isToday ? 'ring-2 ring-white dark:ring-slate-900 ring-offset-2 outline outline-2 outline-white dark:outline-slate-700' : ''} ${isExtra ? 'shadow-sm shadow-warning/20' : ''}`}
                      >
                        {/* Shift Type Indicators */}
                        <div className="absolute top-1 left-1">
                          {isExtra && (
                            <div className="bg-white/20 p-0.5 rounded-md backdrop-blur-[2px]">
                              <Plus size={7} strokeWidth={4} className="text-white" />
                            </div>
                          )}
                          {isFolga && (
                            <X size={9} strokeWidth={3} className="text-slate-300 dark:text-slate-600" />
                          )}
                          {isNormal && !manualShift && (
                            <div className="w-1 h-1 rounded-full bg-white/40" />
                          )}
                        </div>

                        <span className={`text-[17px] font-bold ${textColor} ${isExtra ? '-translate-y-1.5' : ''}`}>{d}</span>
                        
                        {isExtra && (
                          <div className="absolute bottom-2 w-full flex justify-center">
                            <span className="text-[8px] font-bold text-white/90 uppercase tracking-[0.05em]">EXTRA</span>
                          </div>
                        )}

                        {isAnchor && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm z-10" title="Início da Escala"></div>
                        )}

                        <AnimatePresence>
                          {isDayOptionsOpen && isSelected && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 5, scale: 0.95 }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-[105%] left-1/2 -translate-x-1/2 z-[100] bg-white/98 dark:bg-slate-900/98 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] border border-slate-200/80 dark:border-slate-800/80 p-1.5 flex items-center gap-1.5 min-w-[160px]"
                            >
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEditDay(); }}
                                className="flex flex-col items-center justify-center flex-1 h-11 bg-secondary text-white rounded-xl hover:bg-primary-dark transition-all active:scale-95 shadow-sm"
                              >
                                <Edit size={14} />
                                <span className="text-[8px] font-black mt-0.5 tracking-tighter">EDITAR</span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteDay(); }}
                                className="flex flex-col items-center justify-center flex-1 h-11 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl border border-red-100/50 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95 shadow-sm"
                              >
                                <Trash2 size={14} />
                                <span className="text-[8px] font-black mt-0.5 tracking-tighter">EXCLUIR</span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setIsDayOptionsOpen(false); }}
                                className="flex flex-col items-center justify-center flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                              >
                                <X size={14} />
                                <span className="text-[8px] font-black mt-0.5 tracking-tighter">FECHAR</span>
                              </button>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-white/98 dark:border-t-slate-900/98"></div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {(() => {
              const holidays = getBrazilianHolidays(currentYear, currentMonth);
              if (holidays.length === 0) return null;
              return (
                <div className="mt-6 space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Feriados do Mês</h4>
                  <div className="bg-[#1E293B] p-3 rounded-[10px] space-y-2">
                    {holidays.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-white text-xs">
                        <span>🎌</span>
                        <span className="font-bold">{String(h.day).padStart(2, '0')}/{String(currentMonth + 1).padStart(2, '0')}</span>
                        <span className="text-slate-300">- {h.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 flex justify-end items-center">
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 pt-0 space-y-4 overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de Serviço</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setModalData({...modalData, type: 'Normal'})}
                      className={`py-2 px-2 rounded-xl font-bold text-[11px] border-2 transition-all ${
                        modalData.type === 'Normal' 
                          ? 'border-secondary bg-blue-50 dark:bg-blue-900/20 text-secondary dark:text-blue-400' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Normal
                    </button>
                    <button 
                      onClick={() => setModalData({...modalData, type: 'Extra'})}
                      className={`py-2 px-2 rounded-xl font-bold text-[11px] border-2 transition-all ${
                        modalData.type === 'Extra' 
                          ? 'border-warning bg-amber-50 dark:bg-amber-900/20 text-warning dark:text-amber-400' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Extra
                    </button>
                    <button 
                      onClick={() => setModalData({...modalData, type: 'Folga'})}
                      className={`py-2 px-2 rounded-xl font-bold text-[11px] border-2 transition-all ${
                        modalData.type === 'Folga' 
                          ? 'border-slate-400 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Folga
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Início</label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                      <input 
                        type="time" 
                        value={modalData.start}
                        onChange={(e) => setModalData({...modalData, start: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-10 pr-3 font-bold text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fim</label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                      <input 
                        type="time" 
                        value={modalData.end}
                        onChange={(e) => setModalData({...modalData, end: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-10 pr-3 font-bold text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                  </div>
                </div>

                {modalData.type === 'Normal' && (
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center text-white">
                          <Calendar size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-primary-dark dark:text-blue-300">Início da Escala</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">Gerar escala a partir deste dia</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setModalData({...modalData, isStartOfScale: !modalData.isStartOfScale})}
                        className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${modalData.isStartOfScale ? 'bg-secondary' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${modalData.isStartOfScale ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {modalData.type === 'Extra' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duração</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setModalData({...modalData, duration: '12h'})}
                        className={`py-2 rounded-xl font-bold text-[11px] border-2 transition-all ${
                          modalData.duration === '12h' 
                            ? 'border-warning bg-amber-50 dark:bg-amber-900/20 text-warning dark:text-amber-400' 
                            : 'border-slate-100 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        12 Horas
                      </button>
                      <button 
                        onClick={() => setModalData({...modalData, duration: '24h'})}
                        className={`py-2 rounded-xl font-bold text-[11px] border-2 transition-all ${
                          modalData.duration === '24h' 
                            ? 'border-warning bg-amber-50 dark:bg-amber-900/20 text-warning dark:text-amber-400' 
                            : 'border-slate-100 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        24 Horas
                      </button>
                    </div>
                  </div>
                )}

                {modalData.type !== 'Folga' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cor do Evento</label>
                    <div className="flex gap-2 px-1 py-1 overflow-x-auto no-scrollbar">
                      {shiftColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setModalData({...modalData, color: color.value})}
                          className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${color.value} ${
                            modalData.color === color.value 
                              ? 'ring-2 ring-warning ring-offset-2 scale-110' 
                              : 'hover:scale-105'
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {modalData.type === 'Extra' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Local do Extra</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warning" />
                      <select 
                        value={modalData.location}
                        onChange={(e) => setModalData({...modalData, location: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-10 pr-3 font-bold text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-warning appearance-none"
                      >
                        {extraLocations.length > 0 ? (
                          extraLocations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))
                        ) : (
                          <option value="">Nenhum local configurado</option>
                        )}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Informação do Dia</label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3 top-3 text-slate-400" />
                    <textarea 
                      value={modalData.info}
                      onChange={(e) => setModalData({...modalData, info: e.target.value})}
                      placeholder="Ex: Troca de plantão, observações..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-10 pr-3 font-medium text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-secondary min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                  <div className="pt-2 pb-2 flex gap-2">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveChanges}
                      className="flex-1 py-3 rounded-xl font-bold text-[11px] text-white bg-secondary shadow-lg shadow-secondary/20 dark:shadow-none hover:bg-primary-dark transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AddShiftScreen = ({ 
  onCancel, 
  extraLocations, 
  manualShifts, 
  setManualShifts 
}: { 
  onCancel: () => void, 
  extraLocations: string[],
  manualShifts: Record<string, any>,
  setManualShifts: React.Dispatch<React.SetStateAction<Record<string, any>>>
}) => {
  const now = new Date();
  const [shiftType, setShiftType] = useState<'Normal' | 'Extra'>('Normal');
  const [selectedExtraLocation, setSelectedExtraLocation] = useState(extraLocations[0] || '');
  const [selectedColor, setSelectedColor] = useState('bg-secondary');
  const [selectedDuration, setSelectedDuration] = useState<'12h' | '24h'>('12h');
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const shiftColors = [
    { name: 'Laranja', value: 'bg-primary' },
    { name: 'Azul', value: 'bg-secondary' },
    { name: 'Amarelo', value: 'bg-warning' },
    { name: 'Verde', value: 'bg-success' },
    { name: 'Índigo', value: 'bg-indigo-600' },
    { name: 'Vermelho', value: 'bg-red-500' },
    { name: 'Cinza', value: 'bg-slate-500' },
    { name: 'Esmeralda', value: 'bg-emerald-500' },
    { name: 'Roxo', value: 'bg-purple-500' },
    { name: 'Rosa', value: 'bg-pink-500' },
    { name: 'Ciano', value: 'bg-cyan-500' },
    { name: 'Preto', value: 'bg-slate-900' },
  ];

  const handleSave = () => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setManualShifts(prev => ({
      ...prev,
      [dateKey]: {
        type: shiftType,
        color: selectedColor,
        location: shiftType === 'Extra' ? selectedExtraLocation : '',
        duration: shiftType === 'Extra' ? selectedDuration : null
      }
    }));
    onCancel();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="space-y-8 pb-40"
    >
      <div className="space-y-6 mt-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Tipo de Turno</label>
          <div className="relative">
            <select 
              value={shiftType}
              onChange={(e) => {
                const val = e.target.value as 'Normal' | 'Extra';
                setShiftType(val);
                if (val === 'Extra') setSelectedColor('bg-warning');
                else setSelectedColor('bg-secondary');
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-secondary focus:ring-0 rounded-none py-4 px-4 font-bold text-slate-800 dark:text-white appearance-none"
            >
              <option value="Normal">Serviço Normal</option>
              <option value="Extra">Serviço Extra</option>
            </select>
            <ChevronRight size={20} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
          </div>
        </div>

        {shiftType === 'Extra' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Local do Extra</label>
              <div className="relative">
                <select 
                  value={selectedExtraLocation}
                  onChange={(e) => setSelectedExtraLocation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-warning focus:ring-0 rounded-none py-4 px-4 font-bold text-slate-800 dark:text-white appearance-none"
                >
                  {extraLocations.length > 0 ? (
                    extraLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))
                  ) : (
                    <option value="">Nenhum local configurado</option>
                  )}
                </select>
                <ChevronRight size={20} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Duração</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setSelectedDuration('12h')}
                  className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${selectedDuration === '12h' ? 'border-warning bg-warning/10 text-warning' : 'border-slate-100 text-slate-500'}`}
                >
                  12 Horas
                </button>
                <button 
                  onClick={() => setSelectedDuration('24h')}
                  className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${selectedDuration === '24h' ? 'border-warning bg-warning/10 text-warning' : 'border-slate-100 text-slate-500'}`}
                >
                  24 Horas
                </button>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Início</label>
            <div className="bg-slate-50 p-4 flex items-center gap-3 rounded-2xl border-b-2 border-slate-200">
              <Clock size={18} className="text-secondary" />
              <input type="time" defaultValue="07:00" className="bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-800 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Fim</label>
            <div className="bg-slate-50 p-4 flex items-center gap-3 rounded-2xl border-b-2 border-slate-200">
              <Clock size={18} className="text-secondary" />
              <input type="time" defaultValue="19:00" className="bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-800 w-full" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">Data</label>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-slate-900 dark:text-white">{MONTHS[currentMonth]} {currentYear}</span>
              <div className="flex gap-4">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><ChevronLeft size={18} className="text-slate-400" /></button>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><ChevronRight size={18} className="text-slate-400" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {emptyDays.map(e => (
                <div key={`empty-${e}`} className="p-2"></div>
              ))}
              {days.map(d => (
                <div 
                  key={d} 
                  onClick={() => setSelectedDay(d)}
                  className={`p-2 cursor-pointer transition-all rounded-full font-bold ${selectedDay === d ? 'bg-secondary text-white shadow-md' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">Cor do Evento</label>
          <div className="flex gap-4 px-1 py-2 overflow-x-auto no-scrollbar">
            {shiftColors.map((color) => (
              <div 
                key={color.value} 
                onClick={() => setSelectedColor(color.value)}
                className={`w-8 h-8 rounded-full flex-shrink-0 ${color.value} ${selectedColor === color.value ? 'ring-2 ring-warning ring-offset-2 scale-110' : ''} cursor-pointer hover:scale-110 transition-transform`}
                title={color.name}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
        <div className="max-w-[1200px] mx-auto px-6 pb-6 pt-4 flex gap-4">
          <button onClick={onCancel} className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all active:scale-95">Cancelar</button>
          <button onClick={handleSave} className="flex-[2] bg-secondary text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95">Salvar</button>
        </div>
      </div>
    </motion.div>
  );
};

const AnnualView = ({ 
  selectedPattern, 
  anchorDate, 
  manualShifts,
  customWorkDays,
  customOffDays,
  normalDayColor
}: {
  selectedPattern: '12X36' | '1X3' | '2X6' | 'custom';
  anchorDate: Date | null;
  manualShifts: Record<string, any>;
  customWorkDays: number;
  customOffDays: number;
  normalDayColor: string;
}) => {
  const now = new Date();
  const [viewMode] = useState<'month' | 'year'>('year');
  const months = MONTHS;

  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  const checkIsWorkday = (month: number, day: number) => {
    return calculateIsWorkday(
      new Date(currentYear, month, day),
      anchorDate,
      selectedPattern,
      customWorkDays,
      customOffDays
    );
  };

  const allShifts = months.reduce((acc, _, monthIdx) => {
    const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
    let monthShifts = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const manualShift = manualShifts[dateKey];
      if (manualShift) {
        if (manualShift.type !== 'Folga') monthShifts++;
      } else if (checkIsWorkday(monthIdx, d)) {
        monthShifts++;
      }
    }
    return acc + monthShifts;
  }, 0);

  const totalHours = allShifts * 12;

  const displayedMonths = months;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8 pb-32"
    >
      <section className="mt-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">Visão Anual {currentYear}</h1>
      </section>

      <section className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {displayedMonths.map((month) => {
          const idx = months.indexOf(month);
          const daysInMonth = new Date(currentYear, idx + 1, 0).getDate();
          const firstDayOfMonth = new Date(currentYear, idx, 1).getDay();
          const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
          const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

          return (
            <div key={month} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{month}</h3>
                <span className="text-xs font-bold text-slate-300 dark:text-slate-600">{new Date().getFullYear()}</span>
              </div>
              <div className="grid grid-cols-7 gap-y-2 text-center">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase mb-1">{d}</div>
                ))}
                {blanks.map(b => (
                  <div key={`blank-${b}`} className="aspect-square"></div>
                ))}
                {days.map(d => {
                  const dateKey = `${currentYear}-${String(idx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const hasShift = checkIsWorkday(idx, d);
                  const manualShift = manualShifts[dateKey];
                  
                  let bgColor = '';
                  let textColor = 'text-slate-800 dark:text-slate-200';
                  
                  if (manualShift) {
                    if (manualShift.type === 'Folga') {
                      bgColor = '';
                      textColor = 'text-slate-800 dark:text-slate-200';
                    } else {
                      bgColor = manualShift.color || (manualShift.type === 'Extra' ? 'bg-warning' : normalDayColor);
                      textColor = 'text-white';
                    }
                  } else if (hasShift) {
                    bgColor = normalDayColor;
                    textColor = 'text-white';
                  }

                  return (
                    <div 
                      key={d} 
                      className={`aspect-square flex items-center justify-center text-sm rounded-xl transition-all ${bgColor || 'hover:bg-slate-50 dark:hover:bg-slate-800'} ${textColor} ${bgColor ? 'font-bold' : 'font-medium'}`}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="bg-slate-100 dark:bg-slate-900 p-8 rounded-[2rem] space-y-4 border border-transparent dark:border-slate-800">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Legenda de Escala</h4>
          <p className="text-slate-900 dark:text-white text-sm">Resumo da sua jornada anual em {currentYear}</p>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${normalDayColor}`}></div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Serviço Normal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-warning"></div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Serviço Extra</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"></div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Folga</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-l-4 border-primary shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Total de Plantões</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{allShifts}</h2>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-l-4 border-warning shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Horas Totais</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{totalHours}h</h2>
        </div>
      </section>
    </motion.div>
  );
};

const ScheduledShifts = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-6 space-y-8 pb-32"
    >
      <section className="mt-8">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">Escala de Serviço</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Gerencie sua jornada operacional com precisão.</p>
      </section>

      <div className="flex gap-8 border-b border-slate-100 dark:border-slate-800 relative">
        <button className="pb-4 text-secondary font-bold tracking-wide relative">
          Normal
          <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary rounded-t-full"></div>
        </button>
        <button className="pb-4 text-slate-400 dark:text-slate-500 font-semibold tracking-wide">Extra</button>
      </div>

      <section className="space-y-8">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <span className="text-xs font-bold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">{MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</span>
            <div className="h-[1px] flex-grow bg-slate-100 dark:bg-slate-800"></div>
          </div>
          <div className="space-y-4">
            {[
              { date: '12 Mar', day: 'Qui', title: 'Delegacia Central', time: '09:00 - 17:00', hours: '8h total' },
              { date: '15 Mar', day: 'Dom', title: 'Unidade de Choque', time: '08:00 - 20:00', hours: '12h total' },
            ].map(shift => (
              <div key={shift.date} className="bg-white dark:bg-slate-900 rounded-2xl p-6 flex items-start gap-6 relative overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-dark"></div>
                <div className="flex flex-col items-center min-w-[56px]">
                  <span className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase">{shift.date}</span>
                  <span className="text-slate-900 dark:text-white font-bold text-lg">{shift.day}</span>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{shift.title}</h3>
                    <Clock size={18} className="text-secondary" />
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <span className="flex items-center gap-1"><Clock size={12} /> {shift.time}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                    <span className="font-bold text-secondary">{shift.hours}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-6 border border-transparent dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Total no Mês</p>
          <p className="text-lg font-bold text-secondary">28h</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-6 border border-transparent dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Remuneração</p>
          <p className="text-lg font-bold text-green-600">R$ 1.4k</p>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('shifts');
  const [currentScreen, setCurrentScreen] = useState('calendar');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [normalDayColor, setNormalDayColor] = useState('bg-primary');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Lifted state for shifts with localStorage initialization
  const [selectedPattern, setSelectedPattern] = useState<'12X36' | '1X3' | '2X6' | 'custom'>(() => {
    const saved = localStorage.getItem('selectedPattern');
    return (saved as any) || '12X36';
  });
  const [anchorDate, setAnchorDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('anchorDate');
    if (saved) {
      const d = new Date(saved);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });
  const [manualShifts, setManualShifts] = useState<Record<string, { type: 'Normal' | 'Extra' | 'Folga', color?: string, location?: string, duration?: '12h' | '24h', info?: string, start?: string, end?: string }>>(() => {
    const saved = localStorage.getItem('manualShifts');
    return saved ? JSON.parse(saved) : {};
  });
  const [customWorkDays, setCustomWorkDays] = useState(() => {
    const saved = localStorage.getItem('customWorkDays');
    return saved ? Number(saved) : 2;
  });
  const [customOffDays, setCustomOffDays] = useState(() => {
    const saved = localStorage.getItem('customOffDays');
    return saved ? Number(saved) : 5;
  });
  const [hasCustomPattern, setHasCustomPattern] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(() => {
    const saved = localStorage.getItem('hourlyRate');
    return saved ? Number(saved) : 45;
  });
  const [notificationTime, setNotificationTime] = useState<'15m' | '30m' | '1h' | '2h'>(() => {
    const saved = localStorage.getItem('notificationTime');
    return (saved as any) || '30m';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [workplace, setWorkplace] = useState(() => {
    const saved = localStorage.getItem('workplace');
    return saved || 'Delegacia Central';
  });
  const [profession, setProfession] = useState(() => {
    const saved = localStorage.getItem('profession');
    return saved || 'Policial Militar';
  });
  const [extraLocations, setExtraLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('extraLocations');
    return saved ? JSON.parse(saved) : ['Setor Alfa', 'Base Operacional'];
  });
  const [selectedShiftForAlert, setSelectedShiftForAlert] = useState<{ date: string, location: string, startTime: string, endTime: string, type: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sincronizar com localStorage para funcionamento offline
  useEffect(() => {
    localStorage.setItem('selectedPattern', selectedPattern);
    if (anchorDate && !isNaN(anchorDate.getTime())) {
      localStorage.setItem('anchorDate', anchorDate.toISOString());
    }
    localStorage.setItem('manualShifts', JSON.stringify(manualShifts));
    localStorage.setItem('customWorkDays', String(customWorkDays));
    localStorage.setItem('customOffDays', String(customOffDays));
    localStorage.setItem('hourlyRate', String(hourlyRate));
    localStorage.setItem('notificationTime', notificationTime);
    localStorage.setItem('notificationsEnabled', String(notificationsEnabled));
    localStorage.setItem('workplace', workplace);
    localStorage.setItem('profession', profession);
    localStorage.setItem('extraLocations', JSON.stringify(extraLocations));
    localStorage.setItem('darkMode', String(darkMode));
  }, [selectedPattern, anchorDate, manualShifts, customWorkDays, customOffDays, hourlyRate, notificationTime, notificationsEnabled, workplace, profession, extraLocations, darkMode]);

  // Lógica de Alertas Inteligentes
  useEffect(() => {
    if (!notificationsEnabled || !anchorDate) return;

    const checkNextShift = () => {
      const now = new Date();
      // Encontrar o próximo turno
      // Para simplificar, vamos apenas verificar se há um turno hoje ou amanhã
      // e se estamos dentro do tempo de notificação
      
      // Esta é uma simulação simplificada. Em um app real, 
      // usaríamos um Service Worker para agendar notificações.
      console.log('Verificando próximos turnos para alertas...');
    };

    const intervalId = setInterval(checkNextShift, 60000); // Verificar a cada minuto
    checkNextShift();

    return () => clearInterval(intervalId);
  }, [notificationsEnabled, anchorDate, selectedPattern, notificationTime, manualShifts, customWorkDays, customOffDays]);

  // Limpar plantões que não coincidem mais com a nova escala
  useEffect(() => {
    if (!anchorDate || loading) return;

    setManualShifts(prev => {
      let changed = false;
      const next = { ...prev };

      Object.keys(next).forEach(dateKey => {
        const shift = next[dateKey];
        if (!shift) return;

        const [y, m, d] = dateKey.split('-').map(Number);
        const checkDate = new Date(y, m - 1, d);
        
        const isNowWorkday = calculateIsWorkday(
          checkDate, 
          anchorDate, 
          selectedPattern, 
          customWorkDays, 
          customOffDays
        );

        // Se era um turno Extra e agora é dia de trabalho normal, remove o extra
        if (shift.type === 'Extra' && isNowWorkday) {
          delete next[dateKey];
          changed = true;
          return;
        }

        // Se era um turno Normal manual e agora NÃO é dia de trabalho, remove
        if (shift.type === 'Normal' && !isNowWorkday) {
          delete next[dateKey];
          changed = true;
          return;
        }

        // Se era uma Folga manual e agora É dia de trabalho, remove
        if (shift.type === 'Folga' && isNowWorkday) {
          delete next[dateKey];
          changed = true;
          return;
        }

        // Se é um turno Normal que agora coincide com a escala e não tem info extra, remove (redundante)
        if (shift.type === 'Normal' && isNowWorkday) {
          const isRedundant = !shift.info && 
                              (!shift.start || shift.start === '07:00') && 
                              (!shift.end || shift.end === '19:00') && 
                              (!shift.color || shift.color === normalDayColor);
          if (isRedundant) {
            delete next[dateKey];
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [anchorDate, selectedPattern, customWorkDays, customOffDays, loading, normalDayColor]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setIsGuest(false);
        // Carregar configurações do Firestore em tempo real
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userDocRef, { includeMetadataChanges: true }, (snapshot) => {
          setIsSyncing(snapshot.metadata.hasPendingWrites);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setFirestoreLoaded(true);
            if (data.settings) {
              const s = data.settings;
              if (s.darkMode !== undefined) setDarkMode(s.darkMode);
              if (s.selectedPattern) setSelectedPattern(s.selectedPattern);
              if (s.anchorDate) {
                const d = new Date(s.anchorDate);
                if (!isNaN(d.getTime())) setAnchorDate(d);
              }
              if (s.normalDayColor) setNormalDayColor(s.normalDayColor);
              if (s.manualShifts) {
                setManualShifts(s.manualShifts);
              } else if (s.extraDays) {
                // Migração de dados antigos
                const migrated: Record<string, any> = {};
                s.extraDays.forEach((d: string) => {
                  migrated[d] = { type: 'Extra', color: 'bg-warning' };
                });
                setManualShifts(migrated);
              }
              if (s.customWorkDays) setCustomWorkDays(s.customWorkDays);
              if (s.customOffDays) setCustomOffDays(s.customOffDays);
              if (s.hourlyRate) setHourlyRate(s.hourlyRate);
              if (s.notificationTime) setNotificationTime(s.notificationTime);
              if (s.notificationsEnabled !== undefined) setNotificationsEnabled(s.notificationsEnabled);
              if (s.workplace) setWorkplace(s.workplace);
              if (s.extraLocations) {
                if (Array.isArray(s.extraLocations)) {
                  setExtraLocations(s.extraLocations);
                } else if (typeof s.extraLocations === 'string') {
                  setExtraLocations(s.extraLocations.split(',').map((l: string) => l.trim()));
                }
              }
              if (s.profession) setProfession(s.profession);
            }
          } else {
            // Criar documento inicial se não existir
            const initialData = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: 'officer',
              settings: {
                darkMode: false,
                selectedPattern: '12X36',
                anchorDate: new Date().toISOString(),
                manualShifts: {},
                customWorkDays: 2,
                customOffDays: 5,
                hourlyRate: 45,
                notificationTime: '30m',
                notificationsEnabled: true,
                workplace: 'Delegacia Central',
                extraLocations: ['Setor Alfa', 'Base Operacional'],
                profession: 'Sargento'
              }
            };
            setDoc(userDocRef, initialData).catch(error => {
              handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
            });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
      setLoading(false);
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Sincronizar configurações com Firestore quando mudarem
  useEffect(() => {
    // Só sincronizar se o Firestore já tiver carregado pelo menos uma vez
    // ou se o usuário estiver logado e não houver dados no Firestore ainda
    if (user && !loading && firestoreLoaded) {
      const syncSettings = async () => {
        setIsSyncing(true);
        try {
          // Sanitizar manualShifts para remover undefined (JSON.stringify remove chaves undefined)
          const sanitizedManualShifts = JSON.parse(JSON.stringify(manualShifts));

          await updateDoc(doc(db, 'users', user.uid), {
            settings: {
              darkMode,
              selectedPattern,
              anchorDate: (anchorDate && !isNaN(anchorDate.getTime())) ? anchorDate.toISOString() : new Date().toISOString(),
              normalDayColor,
              manualShifts: sanitizedManualShifts,
              customWorkDays,
              customOffDays,
              hourlyRate,
              notificationTime,
              notificationsEnabled,
              workplace,
              profession,
              extraLocations
            }
          });
        } catch (error) {
          // Se for erro de offline, o Firestore já cuidou de enfileirar
          if (!(error instanceof Error && error.message.includes('offline'))) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
          }
        } finally {
          setIsSyncing(false);
        }
      };
      
      const timeoutId = setTimeout(syncSettings, 1000); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [
    user, loading, firestoreLoaded, darkMode, selectedPattern, anchorDate, normalDayColor, 
    manualShifts, customWorkDays, customOffDays, hourlyRate, 
    notificationTime, notificationsEnabled, workplace, profession, extraLocations
  ]);

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
    if (screen === 'calendar' || screen === 'shifts' || screen === 'annual') setActiveTab('shifts');
    if (screen === 'profile') setActiveTab('profile');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'calendar':
        return (
          <CalendarScreen 
            selectedPattern={selectedPattern}
            setSelectedPattern={setSelectedPattern}
            anchorDate={anchorDate}
            setAnchorDate={setAnchorDate}
            manualShifts={manualShifts}
            setManualShifts={setManualShifts}
            customWorkDays={customWorkDays}
            setCustomWorkDays={setCustomWorkDays}
            customOffDays={customOffDays}
            setCustomOffDays={setCustomOffDays}
            hasCustomPattern={hasCustomPattern}
            setHasCustomPattern={setHasCustomPattern}
            extraLocations={extraLocations}
            setSelectedShiftForAlert={setSelectedShiftForAlert}
            handleNavigate={handleNavigate}
            normalDayColor={normalDayColor}
            setNormalDayColor={setNormalDayColor}
          />
        );
      case 'addShift':
        return <AddShiftScreen onCancel={() => handleNavigate('calendar')} extraLocations={extraLocations} manualShifts={manualShifts} setManualShifts={setManualShifts} />;
      case 'annual':
        return (
          <AnnualView 
            selectedPattern={selectedPattern}
            anchorDate={anchorDate}
            manualShifts={manualShifts}
            customWorkDays={customWorkDays}
            customOffDays={customOffDays}
            normalDayColor={normalDayColor}
          />
        );
      case 'shifts':
        return <ScheduledShifts />;
      case 'profile':
        return (
          <ProfileScreen 
            onSignIn={() => setIsGuest(false)} 
            onLogout={() => {
              setIsGuest(false);
              handleNavigate('calendar');
            }}
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            hourlyRate={hourlyRate}
            setHourlyRate={setHourlyRate}
            workplace={workplace}
            setWorkplace={setWorkplace}
            extraLocations={extraLocations}
            setExtraLocations={setExtraLocations}
            profession={profession}
            setProfession={setProfession}
          />
        );
      default:
        return (
          <CalendarScreen 
            selectedPattern={selectedPattern}
            setSelectedPattern={setSelectedPattern}
            anchorDate={anchorDate}
            setAnchorDate={setAnchorDate}
            manualShifts={manualShifts}
            setManualShifts={setManualShifts}
            customWorkDays={customWorkDays}
            setCustomWorkDays={setCustomWorkDays}
            customOffDays={customOffDays}
            setCustomOffDays={setCustomOffDays}
            hasCustomPattern={hasCustomPattern}
            setHasCustomPattern={setHasCustomPattern}
            extraLocations={extraLocations}
            setSelectedShiftForAlert={setSelectedShiftForAlert}
            handleNavigate={handleNavigate}
            normalDayColor={normalDayColor}
            setNormalDayColor={setNormalDayColor}
          />
        );
    }
  };

  const getTitle = () => {
    switch (currentScreen) {
      case 'calendar': return 'Plantão Pro';
      case 'addShift': return 'Adicionar Turno';
      case 'annual': return 'Visão Anual';
      case 'shifts': return 'Escala';
      case 'profile': return 'Meu Perfil';
      default: return 'Plantão Pro';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-dark border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LoginScreen onGuestEnter={() => setIsGuest(true)} />;
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950' : 'bg-[#F8FAFC]'} font-body text-slate-900 dark:text-slate-100 selection:bg-primary/10 transition-colors duration-300 pb-safe relative overflow-hidden`}>
        {/* Background Logo */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] z-0">
          <img 
            src="/logo-plantao.png" 
            alt="Logo Background" 
            className="w-[80%] max-w-[500px] object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        <SideMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)} 
          onProfile={() => handleNavigate('profile')}
          onAnnual={() => handleNavigate('annual')}
          user={user}
        />

        <Header 
          title={getTitle()} 
          showBack={currentScreen !== 'calendar' && activeTab === 'shifts'} 
          onBack={() => handleNavigate('calendar')} 
          onMenu={() => setIsMenuOpen(true)}
          user={user}
          isOffline={isOffline}
          isSyncing={isSyncing}
        />
        
        <main className="max-w-[1200px] ml-0 md:ml-8 lg:ml-12 px-6 md:px-8 pt-4 md:pt-8">
          <AnimatePresence mode="wait">
            {renderScreen()}
          </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}
