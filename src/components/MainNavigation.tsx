import { NavLink } from 'react-router-dom';
import type { CSSProperties } from 'react';

const navItems = [
  { to: '/', label: 'Treinos' },
  { to: '/history', label: 'Histórico' },
  { to: '/settings', label: 'Ajustes' },
];

interface MainNavigationProps {
  className: string;
  style?: CSSProperties;
}

export const MainNavigation = ({ className, style }: MainNavigationProps) => (
  <nav aria-label="Navegação principal" className={className} style={style}>
    {navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          `touch-button flex-1 rounded-2xl ${isActive ? 'bg-accent-500 text-white' : 'bg-white/5 text-zinc-300'}`
        }
      >
        {item.label}
      </NavLink>
    ))}
  </nav>
);
