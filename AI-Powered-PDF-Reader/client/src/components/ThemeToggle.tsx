import React from 'react';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  return (
    <button
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      aria-label="Toggle theme"
    >
        <Moon className="w-5 h-5 text-gray-800" />
        <Sun className="w-5 h-5 text-yellow-400" />
    </button>
  );
};

export default ThemeToggle;