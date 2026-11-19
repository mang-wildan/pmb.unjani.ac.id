import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  // FR-37: varian hover: hanya aktif di perangkat yang benar-benar punya hover (bukan layar
  // sentuh), sehingga kartu tidak tertinggal terangkat setelah disentuh.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // Token publik terpisah dari surface dan radius yang dipakai CMS.
        bg: '#F2F5F0',
        alt: '#E3ECE3',
        ln: '#CBD9CD',
        soft: '#D9EADC',
        ac: '#1D2114',
        foot: '#06281D',
        ff: '#FFFFFF',
        brand: {
          50: '#e7f7f0',
          100: '#c3ecd9',
          200: '#8ed9b8',
          300: '#58c698',
          400: '#3ebd8a',
          DEFAULT: '#063F2A',
          600: '#1e9c6d',
          700: '#178058',
          800: '#116444',
          900: '#06281D',
        },
        accent: {
          50: '#fff8df',
          100: '#ffeeae',
          200: '#ffe17a',
          300: '#ffd457',
          DEFAULT: '#D4AF37',
          600: '#C4A030',
          700: '#b28a00',
        },
        surface: '#ffffff',
        ink: {
          DEFAULT: '#10281D',
          muted: '#576B5F',
          soft: '#8a9499',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(14, 26, 20, 0.18)',
        ring: '0 0 0 4px rgba(36, 180, 127, 0.18)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      container: {
        center: true,
        padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'blob-drift': {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(20px,-10px) scale(1.05)' },
        },
        // Kilau CTA sekali jalan (FR-35): pita terang bergeser melintasi tombol.
        kilau: {
          '0%': { transform: 'translateX(-120%) skewX(-20deg)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translateX(220%) skewX(-20deg)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 500ms ease-out both',
        'scale-in': 'scale-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'blob-drift': 'blob-drift 12s ease-in-out infinite',
        kilau: 'kilau 900ms cubic-bezier(0.22, 1, 0.36, 1) 1 both',
      },
      transitionTimingFunction: {
        gerak: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
