import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { LogIn, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';

const LoginScreen = ({ onGuestEnter }: { onGuestEnter: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('Este domínio não está autorizado no Firebase. Verifique as configurações do console do Firebase.');
      } else {
        setError('Ocorreu um erro ao tentar fazer login. Tente novamente ou use o modo sem login.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 pt-safe pb-safe px-safe">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 text-center"
      >
        <div className="w-24 h-24 bg-transparent flex items-center justify-center mx-auto mb-6 overflow-visible">
          <img 
            src="/logo-plantao.png" 
            alt="Logo" 
            className="w-full h-full object-contain scale-[2.2] drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] contrast-[1.1] brightness-[1.05]"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <h1 className="font-headline text-3xl font-black text-dark mb-2 tracking-tighter">Plantão Pro</h1>
        <p className="text-slate-500 text-sm mb-8 font-medium">Sua escala operacional em um só lugar.</p>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-left"
          >
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
          </motion.div>
        )}

        <div className="space-y-3">
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span>Entrar com Google</span>
          </button>

          <button 
            onClick={onGuestEnter}
            className="w-full flex items-center justify-center gap-3 bg-slate-50 p-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95"
          >
            <span>Continuar sem login</span>
          </button>
        </div>

        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="mt-6 flex items-center justify-center gap-2 mx-auto text-[10px] text-slate-400 font-bold uppercase tracking-wider hover:text-secondary transition-colors"
        >
          <Info size={12} />
          Problemas com login?
        </button>

        {showHelp && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-4 text-left bg-slate-50 p-4 rounded-2xl overflow-hidden"
          >
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2">Dicas para resolver:</h3>
            <ul className="text-[10px] text-slate-400 space-y-1 list-disc pl-4 font-medium">
              <li>Certifique-se de que seu navegador permite pop-ups.</li>
              <li>Em aplicativos (APK), o login do Google pode ser bloqueado. Use o modo "Sem Login".</li>
              <li>Seus dados serão salvos no seu celular mesmo sem login.</li>
            </ul>
          </motion.div>
        )}
        
        <p className="mt-10 text-[10px] text-slate-300 uppercase tracking-[0.3em] font-black">
          Segurança Institucional
        </p>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
