import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Shield, Settings, Bell, HelpCircle, ChevronRight, User, Star, MapPin, Moon, Sun, X, Briefcase, Building2, Map, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';

const ProfileScreen = ({ 
  onSignIn, 
  onLogout,
  darkMode, 
  setDarkMode,
  hourlyRate,
  setHourlyRate,
  workplace,
  setWorkplace,
  extraLocations,
  setExtraLocations,
  profession,
  setProfession
}: { 
  onSignIn: () => void, 
  onLogout: () => void,
  darkMode: boolean, 
  setDarkMode: (val: boolean) => void,
  hourlyRate: number,
  setHourlyRate: (val: number) => void,
  workplace: string,
  setWorkplace: (val: string) => void,
  extraLocations: string[],
  setExtraLocations: (val: string[]) => void,
  profession: string,
  setProfession: (val: string) => void
}) => {
  const user = auth.currentUser;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Local state for modal inputs to avoid frequent Firestore writes
  const [tempWorkplace, setTempWorkplace] = useState(workplace);
  const [tempExtraLocations, setTempExtraLocations] = useState<string[]>(extraLocations);
  const [tempProfession, setTempProfession] = useState(profession);
  const [newExtraLocation, setNewExtraLocation] = useState('');

  useEffect(() => {
    setTempWorkplace(workplace);
    setTempExtraLocations(extraLocations);
    setTempProfession(profession);
  }, [workplace, extraLocations, profession]);

  const handleAddExtraLocation = () => {
    if (newExtraLocation.trim()) {
      setTempExtraLocations([...tempExtraLocations, newExtraLocation.trim()]);
      setNewExtraLocation('');
    }
  };

  const handleRemoveExtraLocation = (index: number) => {
    setTempExtraLocations(tempExtraLocations.filter((_, i) => i !== index));
  };

  const handleSaveSettings = async () => {
    setWorkplace(tempWorkplace);
    setExtraLocations(tempExtraLocations);
    setProfession(tempProfession);
    setIsSettingsOpen(false);

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'settings.workplace': tempWorkplace,
          'settings.extraLocations': tempExtraLocations,
          'settings.profession': tempProfession
        });
      } catch (error) {
        console.error('Error saving profile settings:', error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { icon: Bell, label: 'Notificações', color: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/30' },
    { icon: Shield, label: 'Segurança', color: 'text-green-500', bg: 'bg-green-50', darkBg: 'dark:bg-green-900/30' },
    { icon: Settings, label: 'Configurações', color: 'text-slate-500', bg: 'bg-slate-50', darkBg: 'dark:bg-slate-800' },
    { icon: HelpCircle, label: 'Ajuda e Suporte', color: 'text-amber-500', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/30' },
  ];

  if (!user) {
    return (
      <>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-8 pb-32 px-6 pt-4"
        >
          <div className="bg-white dark:bg-slate-950 p-8 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-900 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-900 dark:to-slate-800 opacity-10"></div>
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-900 mx-auto mb-4 border-4 border-white dark:border-slate-950 shadow-lg flex items-center justify-center">
                <User size={40} className="text-slate-200 dark:text-slate-800" />
              </div>
              <h2 className="font-headline text-2xl font-black text-slate-800 dark:text-slate-100 mb-1 tracking-tight">Modo Visitante</h2>
              <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-6">Entre com sua conta para salvar dados na nuvem.</p>
              <button 
                onClick={onSignIn}
                className="bg-primary text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Fazer Login agora
              </button>
            </div>
          </div>

          {/* Dark Mode Toggle for Guests */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center">
                {darkMode ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-amber-500" />}
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">Modo Noturno</span>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/20">
            <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
              <Star size={18} className="fill-blue-800 dark:fill-blue-400" />
              Por que entrar?
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-500 space-y-2 font-medium">
              <li>• Sincronização entre dispositivos</li>
              <li>• Backup automático da sua escala</li>
              <li>• Alertas personalizados por e-mail</li>
              <li>• Histórico completo de serviços</li>
            </ul>
          </div>

          {/* Guest Menu Options */}
          <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-md border border-slate-100 dark:border-slate-900 overflow-hidden">
            {menuItems.map((item, index, filteredArr) => {
              const Icon = item.icon;
              return (
                <button 
                  key={index}
                  onClick={() => {
                    if (item.label === 'Configurações') setIsSettingsOpen(true);
                  }}
                  className={`w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                    index !== filteredArr.length - 1 ? 'border-b border-slate-100 dark:border-slate-900' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${item.bg} ${item.darkBg} rounded-xl flex items-center justify-center`}>
                      <Icon size={20} className={item.color} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{item.label}</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-700" />
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Settings Modal (Accessible for Guests too) */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              
              <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <Settings size={20} />
                    </div>
                    <h3 className="font-headline font-black text-xl text-slate-900 dark:text-white tracking-tight">Configurações de Perfil</h3>
                  </div>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {/* Profession */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Sua Profissão</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Briefcase size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={tempProfession}
                        onChange={(e) => setTempProfession(e.target.value)}
                        placeholder="Ex: Sargento, Agente, Oficial..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-secondary dark:focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 dark:text-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Workplace */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Local onde trabalha</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Building2 size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={tempWorkplace}
                        onChange={(e) => setTempWorkplace(e.target.value)}
                        placeholder="Ex: Delegacia Central, Batalhão X..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-secondary dark:focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 dark:text-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Extra Locations */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Locais onde tira extra</label>
                    
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Map size={18} />
                        </div>
                        <input 
                          type="text" 
                          value={newExtraLocation}
                          onChange={(e) => setNewExtraLocation(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddExtraLocation()}
                          placeholder="Adicionar local..."
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-secondary dark:focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 dark:text-white transition-all outline-none"
                        />
                      </div>
                      <button 
                        onClick={handleAddExtraLocation}
                        className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-4 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95"
                      >
                        <Plus size={24} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {tempExtraLocations.map((loc, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                        >
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{loc}</span>
                          <button 
                            onClick={() => handleRemoveExtraLocation(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))}
                      {tempExtraLocations.length === 0 && (
                        <p className="text-xs text-slate-400 italic">Nenhum local extra adicionado.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={handleSaveSettings}
                      className="w-full bg-gradient-to-r from-primary-dark to-secondary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-dark/20 active:scale-95 transition-all"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 pb-32 px-6 pt-4"
    >
      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-950 p-8 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-900 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary-dark to-secondary opacity-5"></div>
        
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-slate-900 mx-auto mb-4 border-4 border-white dark:border-slate-950 shadow-lg overflow-hidden">
            <img 
              src={user?.photoURL || "https://picsum.photos/seed/officer/100/100"} 
              alt={user?.displayName || "Oficial"} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h2 className="font-headline text-2xl font-black text-primary-dark dark:text-blue-400 mb-1 tracking-tight">
            {user?.displayName || "Oficial Silva"}
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-4">{user?.email}</p>
          
          <div className="flex justify-center gap-3">
            <div className="flex items-center gap-1 text-[10px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100/50 dark:border-transparent">
              <Star size={12} fill="currentColor" />
              <span>{profession || "Sargento"}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-200/50 dark:border-transparent">
              <MapPin size={12} />
              <span>{workplace || "Setor Alfa"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dark Mode Toggle */}
      <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center">
            {darkMode ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-amber-500" />}
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-200">Modo Noturno</span>
        </div>
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`}></div>
        </button>
      </div>

      {/* Hourly Rate Setting */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
            <Star size={20} />
          </div>
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-200 block">Valor da Hora Extra</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Calculadora de Gratificações</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="pl-3 font-bold text-slate-300 dark:text-slate-700">R$</span>
          <input 
            type="number" 
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className="w-full bg-transparent border-none focus:ring-0 font-black text-slate-900 dark:text-white text-lg"
          />
          <span className="pr-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">/hora</span>
        </div>
      </div>

      {/* Menu List */}
      <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-md border border-slate-100 dark:border-slate-900 overflow-hidden">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button 
              key={index}
              onClick={() => {
                if (item.label === 'Configurações') setIsSettingsOpen(true);
              }}
              className={`w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-900' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 ${item.bg} ${item.darkBg} rounded-xl flex items-center justify-center`}>
                  <Icon size={20} className={item.color} />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300 dark:text-slate-700" />
            </button>
          );
        })}
      </div>

      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-95 border border-red-100 dark:border-red-900/20 shadow-sm"
      >
        <LogOut size={18} />
        <span>Sair da Conta</span>
      </button>

      <div className="text-center pt-4">
        <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-[0.3em]">
          Plantão Extra v2.0.0
        </p>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-900"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Settings size={20} />
                  </div>
                  <h3 className="font-headline font-black text-xl text-slate-900 dark:text-white tracking-tight">Configurações de Perfil</h3>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Profession */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Sua Profissão</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600">
                      <Briefcase size={18} />
                    </div>
                    <input 
                      type="text" 
                      value={tempProfession}
                      onChange={(e) => setTempProfession(e.target.value)}
                      placeholder="Ex: Sargento, Agente, Oficial..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-secondary dark:focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 dark:text-white transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Workplace */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Local onde trabalha</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600">
                      <Building2 size={18} />
                    </div>
                    <input 
                      type="text" 
                      value={tempWorkplace}
                      onChange={(e) => setTempWorkplace(e.target.value)}
                      placeholder="Ex: Delegacia Central, Batalhão X..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-secondary dark:focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 dark:text-white transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Extra Locations */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Locais onde tira extra</label>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600">
                        <Map size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={newExtraLocation}
                        onChange={(e) => setNewExtraLocation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddExtraLocation()}
                        placeholder="Adicionar local..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-secondary dark:focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 dark:text-white transition-all outline-none"
                      />
                    </div>
                    <button 
                      onClick={handleAddExtraLocation}
                      className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-4 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95"
                    >
                      <Plus size={24} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {tempExtraLocations.map((loc, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800"
                      >
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{loc}</span>
                        <button 
                          onClick={() => handleRemoveExtraLocation(idx)}
                          className="text-slate-400 dark:text-slate-600 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                    {tempExtraLocations.length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-600 italic">Nenhum local extra adicionado.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveSettings}
                    className="w-full bg-gradient-to-r from-primary-dark to-secondary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-dark/20 active:scale-95 transition-all"
                  >
                    Salvar Alterações
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

export default ProfileScreen;
