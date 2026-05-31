// @ts-nocheck
import { motion } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';

export const AnimatedThemeToggler = ({
  duration = 450,
  className = '',
}) => {
  const [theme, setTheme] = useState(() => {
    // Default to dark for Aergia Engine, check localStorage first
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';

    // Fallback for browsers that don't support View Transitions API
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(nextTheme);
      return;
    }

    const button = buttonRef.current;
    if (!button) {
      setTheme(nextTheme);
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      
      document.documentElement.animate(
        {
          clipPath,
        },
        {
          duration,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center border border-white/10 dark:border-white/10 light:border-black/10 bg-white/5 hover:bg-white/10 transition-colors focus:outline-none cursor-pointer ${className}`}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          scale: theme === 'light' ? 0 : 1,
          rotate: theme === 'light' ? 90 : 0,
          opacity: theme === 'light' ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute flex items-center justify-center text-amber-300"
      >
        <Moon className="w-5 h-5" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          scale: theme === 'light' ? 1 : 0,
          rotate: theme === 'light' ? 0 : -90,
          opacity: theme === 'light' ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute flex items-center justify-center text-orange-500"
      >
        <Sun className="w-5 h-5" />
      </motion.div>
    </button>
  );
};
