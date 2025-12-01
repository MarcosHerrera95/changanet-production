export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PALETA OFICIAL CHANGÁNET
        // Colores primarios
        primary: {
          DEFAULT: '#E30613',
          hover: '#C9050F',
        },
        
        // Colores de texto
        text: {
          main: '#343A40',
          secondary: '#6C757D',
          tertiary: '#ADB5BD',
        },
        
        // Estados
        success: {
          DEFAULT: '#28A745',
          light: '#10B981',
        },
        warning: '#FFC107',
        error: '#DC3545',
        info: '#3B82F6',
        
        // Alias para compatibilidad con código existente
        'changanet-red': '#E30613',
        'changanet-white': '#FFFFFF',
        'changanet-text': '#343A40',
        'changanet-text-secondary': '#6C757D',
        'changanet-success': '#28A745',
        'changanet-warning': '#FFC107',
        'changanet-error': '#DC3545',
        'changanet-placeholder': '#F8F9FA',
        
        // Escala de grises institucional
        gray: {
          50: '#F8F9FA',
          100: '#F8F9FA',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
          600: '#6C757D',
          700: '#495057',
          800: '#343A40',
          900: '#212529',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-in-out',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
