import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0A0912',
        surface: '#14111F',
        line: 'rgba(157,78,255,0.22)',
        lime: '#10E89C',
        emerald: '#10E89C',
        violet: '#9D4EFF',
        cyan: '#38E8FF',
        fuchsia: '#FF2EC4',
        fg: '#F4F1FF',
        muted: '#A99FC9',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        'neon-lime': '0 0 20px rgba(16,232,156,0.4), 0 0 40px rgba(16,232,156,0.15)',
        'neon-violet': '0 0 20px rgba(157,78,255,0.4), 0 0 40px rgba(157,78,255,0.15)',
        'neon-cyan': '0 0 20px rgba(56,232,255,0.3), 0 0 40px rgba(56,232,255,0.1)',
        glass: '0 8px 32px rgba(0,0,0,0.3)',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(110px, -130px) scale(1.25)' },
          '50%': { transform: 'translate(-90px, 90px) scale(0.8)' },
          '75%': { transform: 'translate(140px, -60px) scale(1.15)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow:
              '0 0 20px rgba(16,232,156,0.35), 0 0 40px rgba(16,232,156,0.1)',
          },
          '50%': {
            boxShadow:
              '0 0 30px rgba(16,232,156,0.55), 0 0 60px rgba(16,232,156,0.2)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        marquee: 'marquee 28s linear infinite',
        float: 'float 12.5s ease-in-out infinite',
        'float-slow': 'float 16s ease-in-out infinite',
        'float-fast': 'float 9s ease-in-out infinite',
        'float-faster': 'float 6.5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
