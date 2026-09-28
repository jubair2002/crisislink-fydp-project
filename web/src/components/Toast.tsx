import toast from 'react-hot-toast';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      style: {
        background: '#0F172A',
        color: '#F8FAFC',
        border: '1px solid #1E293B',
        fontSize: '0.875rem',
        fontWeight: 500,
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      },
      iconTheme: {
        primary: '#22C55E',
        secondary: '#0F172A',
      },
    });
  },
  error: (message: string) => {
    toast.error(message, {
      style: {
        background: '#0F172A',
        color: '#F8FAFC',
        border: '1px solid #1E293B',
        fontSize: '0.875rem',
        fontWeight: 500,
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      },
      iconTheme: {
        primary: '#EF4444',
        secondary: '#0F172A',
      },
    });
  },
  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      style: {
        background: '#0F172A',
        color: '#F8FAFC',
        border: '1px solid #1E293B',
        fontSize: '0.875rem',
        fontWeight: 500,
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      },
    });
  },
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      style: {
        background: '#0F172A',
        color: '#F8FAFC',
        border: '1px solid #1E293B',
        fontSize: '0.875rem',
        fontWeight: 500,
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      },
    });
  },
};
