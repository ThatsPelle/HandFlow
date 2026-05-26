/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#05060a',
        graphite: '#0c1118',
        panel: 'rgba(12, 17, 24, 0.74)',
        cyan: {
          core: '#22d3ee',
          soft: '#67e8f9',
        },
        violet: {
          core: '#a855f7',
          soft: '#c084fc',
        },
        signal: {
          green: '#34d399',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
      },
      boxShadow: {
        glow: '0 0 34px rgba(34, 211, 238, 0.2)',
        violet: '0 0 34px rgba(168, 85, 247, 0.18)',
        panel: '0 24px 80px rgba(0, 0, 0, 0.42)',
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'stage-radial':
          'radial-gradient(circle at 50% 0%, rgba(34, 211, 238, 0.22), transparent 34%), linear-gradient(145deg, rgba(168, 85, 247, 0.14), transparent 38%)',
        'hud-grid':
          'linear-gradient(rgba(34, 211, 238, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.08) 1px, transparent 1px)',
      },
      animation: {
        scan: 'scan 4.8s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.8s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(-12%)', opacity: '0' },
          '18%, 84%': { opacity: '1' },
          '50%': { transform: 'translateY(112%)', opacity: '0.7' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.56' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
