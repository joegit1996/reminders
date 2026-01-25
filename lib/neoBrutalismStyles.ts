// Neo-Brutalism Design System
// Reference: https://neo-brutalism-ui-library.vercel.app/

export const neoColors = {
  background: '#FFE66D', // Bright yellow
  white: '#FFFFFF',
  black: '#000000',
  primary: '#4ECDC4', // Cyan
  secondary: '#FF6B6B', // Pink/Red
  accent: '#95E1D3', // Light cyan
  warning: '#FFD93D', // Yellow
  success: '#6BCB77', // Green
  purple: '#A8E6CF', // Light green
};

export const neoStyles = {
  // Card/Container styles
  card: {
    background: neoColors.white,
    border: '4px solid #000000',
    borderRadius: '0',
    boxShadow: '8px 8px 0px 0px #000000',
    padding: '1.5rem',
  },
  
  // Button base styles
  button: {
    borderRadius: '0',
    border: '3px solid #000000',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.1s',
    boxShadow: '4px 4px 0px 0px #000000',
  },
  
  buttonHover: {
    transform: 'translate(2px, 2px)',
    boxShadow: '2px 2px 0px 0px #000000',
  },
  
  // Input styles
  input: {
    borderRadius: '0',
    border: '3px solid #000000',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    background: neoColors.white,
    color: neoColors.black,
  },
  
  inputFocus: {
    outline: 'none',
    boxShadow: '4px 4px 0px 0px #000000',
  },
  
  // Typography
  heading: {
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '-0.02em',
    color: neoColors.black,
  },
  
  // Modal overlay
  modalOverlay: {
    background: 'rgba(0, 0, 0, 0.7)',
  },
  
  // Modal content
  modalContent: {
    background: neoColors.white,
    border: '4px solid #000000',
    borderRadius: '0',
    boxShadow: '12px 12px 0px 0px #000000',
  },
};

// Button color variants
export const buttonVariants = {
  primary: {
    background: neoColors.primary,
    color: neoColors.black,
  },
  secondary: {
    background: neoColors.secondary,
    color: neoColors.black,
  },
  success: {
    background: neoColors.success,
    color: neoColors.black,
  },
  warning: {
    background: neoColors.warning,
    color: neoColors.black,
  },
  danger: {
    background: neoColors.secondary,
    color: neoColors.black,
  },
  neutral: {
    background: '#E5E5E5',
    color: neoColors.black,
  },
};
