import React, { createContext, useReducer, useEffect } from 'react';

const PaymentContext = createContext();

// Action types
const PAYMENT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_PAYMENT_STATUS: 'SET_PAYMENT_STATUS',
  UPDATE_PAYMENT_HISTORY: 'UPDATE_PAYMENT_HISTORY',
  SET_PAYOUT_DATA: 'SET_PAYOUT_DATA',
  SET_COMMISSION_SETTINGS: 'SET_COMMISSION_SETTINGS',
  SET_BANK_ACCOUNTS: 'SET_BANK_ACCOUNTS',
  SET_WITHDRAWAL_REQUESTS: 'SET_WITHDRAWAL_REQUESTS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_REAL_TIME_UPDATES: 'SET_REAL_TIME_UPDATES'
};

// Initial state
const initialState = {
  loading: false,
  error: null,
  paymentStatus: {},
  paymentHistory: [],
  payoutData: {
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayments: 0,
    completedServices: 0,
    payouts: [],
    stats: {}
  },
  commissionSettings: [],
  bankAccounts: [],
  withdrawalRequests: [],
  notifications: [],
  realTimeUpdates: false
};

// Reducer
function paymentReducer(state, action) {
  switch (action.type) {
    case PAYMENT_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case PAYMENT_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case PAYMENT_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case PAYMENT_ACTIONS.SET_PAYMENT_STATUS:
      return {
        ...state,
        paymentStatus: {
          ...state.paymentStatus,
          [action.payload.paymentId]: action.payload.status
        }
      };

    case PAYMENT_ACTIONS.UPDATE_PAYMENT_HISTORY:
      return { ...state, paymentHistory: action.payload };

    case PAYMENT_ACTIONS.SET_PAYOUT_DATA:
      return { ...state, payoutData: { ...state.payoutData, ...action.payload } };

    case PAYMENT_ACTIONS.SET_COMMISSION_SETTINGS:
      return { ...state, commissionSettings: action.payload };

    case PAYMENT_ACTIONS.SET_BANK_ACCOUNTS:
      return { ...state, bankAccounts: action.payload };

    case PAYMENT_ACTIONS.SET_WITHDRAWAL_REQUESTS:
      return { ...state, withdrawalRequests: action.payload };

    case PAYMENT_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, {
          id: Date.now(),
          ...action.payload,
          timestamp: new Date()
        }]
      };

    case PAYMENT_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case PAYMENT_ACTIONS.SET_REAL_TIME_UPDATES:
      return { ...state, realTimeUpdates: action.payload };

    default:
      return state;
  }
}

// Provider component
export function PaymentProvider({ children }) {
  const [state, dispatch] = useReducer(paymentReducer, initialState);
  // const { user } = useAuth(); // Available if needed for future features

  // Clear error after 5 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        dispatch({ type: PAYMENT_ACTIONS.CLEAR_ERROR });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Auto-remove notifications after 10 seconds
  useEffect(() => {
    state.notifications.forEach(notification => {
      if (notification.autoRemove !== false) {
        setTimeout(() => {
          dispatch({ type: PAYMENT_ACTIONS.REMOVE_NOTIFICATION, payload: notification.id });
        }, 10000);
      }
    });
  }, [state.notifications]);

  // Context value
  const value = {
    // State
    ...state,

    // Actions
    setLoading: (loading) => dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: PAYMENT_ACTIONS.CLEAR_ERROR }),

    updatePaymentStatus: (paymentId, status) =>
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYMENT_STATUS, payload: { paymentId, status } }),

    updatePaymentHistory: (history) =>
      dispatch({ type: PAYMENT_ACTIONS.UPDATE_PAYMENT_HISTORY, payload: history }),

    updatePayoutData: (data) =>
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYOUT_DATA, payload: data }),

    setCommissionSettings: (settings) =>
      dispatch({ type: PAYMENT_ACTIONS.SET_COMMISSION_SETTINGS, payload: settings }),

    setBankAccounts: (accounts) =>
      dispatch({ type: PAYMENT_ACTIONS.SET_BANK_ACCOUNTS, payload: accounts }),

    setWithdrawalRequests: (requests) =>
      dispatch({ type: PAYMENT_ACTIONS.SET_WITHDRAWAL_REQUESTS, payload: requests }),

    addNotification: (notification) =>
      dispatch({ type: PAYMENT_ACTIONS.ADD_NOTIFICATION, payload: notification }),

    removeNotification: (id) =>
      dispatch({ type: PAYMENT_ACTIONS.REMOVE_NOTIFICATION, payload: id }),

    setRealTimeUpdates: (enabled) =>
      dispatch({ type: PAYMENT_ACTIONS.SET_REAL_TIME_UPDATES, payload: enabled }),

    // Helper functions
    showSuccess: (message) => dispatch({
      type: PAYMENT_ACTIONS.ADD_NOTIFICATION,
      payload: { type: 'success', message }
    }),

    showError: (message) => dispatch({
      type: PAYMENT_ACTIONS.ADD_NOTIFICATION,
      payload: { type: 'error', message }
    }),

    showInfo: (message) => dispatch({
      type: PAYMENT_ACTIONS.ADD_NOTIFICATION,
      payload: { type: 'info', message }
    }),

    showWarning: (message) => dispatch({
      type: PAYMENT_ACTIONS.ADD_NOTIFICATION,
      payload: { type: 'warning', message }
    })
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
}

export default PaymentContext;
