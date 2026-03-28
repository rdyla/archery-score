import { NavLink } from 'react-router-dom';
import { Home, Clock, User } from 'lucide-react';
import { clsx } from 'clsx';

const links = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 safe-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors tap-highlight-none',
                isActive ? 'text-brand-500' : 'text-gray-500'
              )
            }
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
