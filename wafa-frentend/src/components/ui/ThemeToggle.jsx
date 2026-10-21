import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './button';
import { useTheme, themeSwitchingEnabled } from '@/context/ThemeContext';

const ThemeToggle = () => {
  const { currentTheme, changeTheme } = useTheme();

  const toggle = () => {
    changeTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button variant="ghost" disabled={!themeSwitchingEnabled} onClick={toggle}
      aria-label="Changer le thème" title={themeSwitchingEnabled ? "Changer le thème" : "Mode sombre temporairement indisponible"}
      className="h-9 w-9 sm:h-10 sm:w-10">
      {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};

export default ThemeToggle;
