import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Table2, Shield, Users, Menu, X, Activity } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Οι επιλογές του μενού
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Standings', path: '/standings', icon: Table2 },
    { name: 'Teams', path: '/teams', icon: Shield },
    { name: 'Players', path: '/players', icon: Users },
    { name: 'Teams Comparison', path: '/teams-comparison', icon: Activity },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-slate-950/80 backdrop-blur-lg border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        
        {/* LOGO */}
        <Link to="/" className="flex shrink-0 items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-white group lg:text-2xl">
          <Activity className="text-blue-500 group-hover:rotate-12 transition-transform" />
          Transfer<span className="text-blue-500">Mind</span>
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-3 lg:gap-8">
          {navItems.map((item) => {
            // Ελέγχουμε αν η τωρινή σελίδα ταιριάζει με το path του κουμπιού
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all lg:gap-2 lg:text-sm ${
                  isActive ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-blue-500' : ''} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* MOBILE MENU TOGGLE (Hamburger) */}
        <button 
          className="md:hidden text-slate-400 hover:text-white p-2 bg-slate-900 rounded-xl border border-slate-800" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* MOBILE MENU (Ανοίγει όταν πατάς το Hamburger στα κινητά) */}
      {isOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 absolute w-full shadow-2xl">
          <div className="flex flex-col px-6 py-6 space-y-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)} // Κλείνει το μενού όταν πατάς μια επιλογή
                  className={`flex items-center gap-4 text-lg font-black uppercase tracking-widest transition-all p-4 rounded-2xl ${
                    isActive ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <item.icon size={24} className={isActive ? 'text-blue-500' : ''} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
