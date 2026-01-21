
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Store, ShieldCheck } from 'lucide-react';

interface OwnerLoginProps {
  onLogin: (passcode: string) => boolean;
}

const OwnerLogin: React.FC<OwnerLoginProps> = ({ onLogin }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(passcode)) {
      navigate('/owner');
    } else {
      setError(true);
      setPasscode('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-block bg-orange-500 p-4 rounded-3xl shadow-2xl shadow-orange-500/30 mb-4 animate-bounce-slow">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">管理員登入</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">請輸入您的 8 位數管理密碼</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••••"
              className={`w-full bg-slate-900 border-2 ${error ? 'border-red-500 animate-shake' : 'border-slate-800 group-hover:border-slate-700'} text-white text-center text-3xl tracking-[1em] py-5 rounded-2xl focus:outline-none focus:border-orange-500 transition-all placeholder:text-slate-800`}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs text-center mt-3 font-bold flex items-center justify-center gap-1 animate-in fade-in slide-in-from-top-1">密碼不正確，請重新輸入</p>}
          </div>

          <button
            type="submit"
            disabled={passcode.length < 8}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-500/10 ${passcode.length === 8 ? 'bg-orange-500 text-white active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
          >
            登入管理系統 <ArrowRight size={20} />
          </button>
        </form>

        <button
          onClick={() => navigate('/customer')}
          className="w-full mt-8 text-slate-600 text-sm font-bold hover:text-slate-400 transition-colors uppercase tracking-widest"
        >
          返回點餐
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        .animate-bounce-slow { animation: bounce 3s infinite; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default OwnerLogin;
