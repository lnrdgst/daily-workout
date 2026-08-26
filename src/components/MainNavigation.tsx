import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Treinos' },
  { to: '/history', label: 'Histórico' },
  { to: '/settings', label: 'Ajustes' },
];

interface MainNavigationProps {
  className: string;
}

export const MainNavigation = ({ className }: MainNavigationProps) => (
  <nav aria-label="Navegação principal" className={className}>
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
