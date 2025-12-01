import { useState, useCallback } from 'react';
import { usePayment } from './usePayment';

/**
 * Custom hook for payment API operations
 */
export function usePaymentAPI() {
  const { setLoading, setError, showSuccess, showError, updatePaymentStatus } = usePayment();
  const [isProcessing, setIsProcessing] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = sessionStorage.getItem('changanet_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Create payment preference
  const createPaymentPreference = useCallback(async (paymentData) => {
    setLoading(true);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creating payment preference');
      }

      const data = await response.json();
      showSuccess('Preferencia de pago creada exitosamente');
      return data;
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders]);

  // Get payment status
  const getPaymentStatus = useCallback(async (paymentId) => {
    try {
      const response = await fetch(`/api/payments/status/${paymentId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error obteniendo estado del pago');
      }

      const data = await response.json();
      updatePaymentStatus(paymentId, data.status);
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [setError, getAuthHeaders, updatePaymentStatus]);

  // Release funds
  const releaseFunds = useCallback(async (paymentId) => {
    setLoading(true);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/release-funds', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ paymentId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error liberando fondos');
      }

      const data = await response.json();
      showSuccess('Fondos liberados exitosamente');
      updatePaymentStatus(paymentId, 'completed');
      return data;
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders, updatePaymentStatus]);

  // Withdraw funds
  const withdrawFunds = useCallback(async (withdrawalData) => {
    setLoading(true);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withdrawalData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error procesando retiro');
      }

      const data = await response.json();
      showSuccess('Solicitud de retiro creada exitosamente');
      return data;
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders]);

  // Get payment receipt
  const getPaymentReceipt = useCallback(async (paymentId) => {
    try {
      const response = await fetch(`/api/payments/receipt/${paymentId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error obteniendo comprobante');
      }

      return await response.blob();
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [setError, getAuthHeaders]);

  // Download receipt
  const downloadReceipt = useCallback(async (fileName) => {
    try {
      const response = await fetch(`/api/payments/receipts/${fileName}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error descargando comprobante');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError(error.message);
      showError('Error descargando comprobante');
    }
  }, [setError, showError, getAuthHeaders]);

  return {
    isProcessing,
    createPaymentPreference,
    getPaymentStatus,
    releaseFunds,
    withdrawFunds,
    getPaymentReceipt,
    downloadReceipt
  };
}

/**
 * Custom hook for bank account operations
 */
export function useBankAccountAPI() {
  const { setLoading, setError, showSuccess, showError, setBankAccounts } = usePayment();

  const getAuthHeaders = useCallback(() => {
    const token = sessionStorage.getItem('changanet_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Get bank accounts
  const getBankAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/bank-accounts', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error obteniendo cuentas bancarias');
      }

      const data = await response.json();
      setBankAccounts(data.data || []);
      return data.data || [];
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, getAuthHeaders, setBankAccounts]);

  // Create bank account
  const createBankAccount = useCallback(async (accountData) => {
    setLoading(true);

    try {
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(accountData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creando cuenta bancaria');
      }

      const data = await response.json();
      showSuccess('Cuenta bancaria creada exitosamente');
      await getBankAccounts(); // Refresh list
      return data;
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders, getBankAccounts]);

  // Update bank account
  const updateBankAccount = useCallback(async (accountId, accountData) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(accountData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error actualizando cuenta bancaria');
      }

      const data = await response.json();
      showSuccess('Cuenta bancaria actualizada exitosamente');
      await getBankAccounts(); // Refresh list
      return data;
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders, getBankAccounts]);

  // Delete bank account
  const deleteBankAccount = useCallback(async (accountId) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error eliminando cuenta bancaria');
      }

      showSuccess('Cuenta bancaria eliminada exitosamente');
      await getBankAccounts(); // Refresh list
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders, getBankAccounts]);

  return {
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount
  };
}

/**
 * Custom hook for withdrawal operations
 */
export function useWithdrawalAPI() {
  const { setLoading, setError, showSuccess, showError, setWithdrawalRequests } = usePayment();

  const getAuthHeaders = useCallback(() => {
    const token = sessionStorage.getItem('changanet_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Get withdrawal requests
  const getWithdrawalRequests = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/withdrawals', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error obteniendo solicitudes de retiro');
      }

      const data = await response.json();
      setWithdrawalRequests(data.data || []);
      return data.data || [];
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, getAuthHeaders, setWithdrawalRequests]);

  // Create withdrawal request
  const createWithdrawalRequest = useCallback(async (withdrawalData) => {
    setLoading(true);

    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(withdrawalData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creando solicitud de retiro');
      }

      const data = await response.json();
      showSuccess('Solicitud de retiro creada exitosamente');
      await getWithdrawalRequests(); // Refresh list
      return data;
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders, getWithdrawalRequests]);

  // Get available funds
  const getAvailableFunds = useCallback(async () => {
    try {
      const response = await fetch('/api/withdrawals/available-funds', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error obteniendo fondos disponibles');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [setError, getAuthHeaders]);

  return {
    getWithdrawalRequests,
    createWithdrawalRequest,
    getAvailableFunds
  };
}

/**
 * Custom hook for payout operations
 */
export function usePayoutAPI() {
  const { setLoading, setError, updatePayoutData } = usePayment();

  const getAuthHeaders = useCallback(() => {
    const token = sessionStorage.getItem('changanet_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Get payouts
  const getPayouts = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/payouts', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error obteniendo payouts');
      }

      const data = await response.json();
      updatePayoutData({ payouts: data.data || [] });
      return data.data || [];
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, getAuthHeaders, updatePayoutData]);

  // Get payout stats
  const getPayoutStats = useCallback(async () => {
    try {
      const response = await fetch('/api/payouts/stats', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error obteniendo estadísticas de payouts');
      }

      const data = await response.json();
      updatePayoutData({ stats: data.data || {} });
      return data.data || {};
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [setError, getAuthHeaders, updatePayoutData]);

  return {
    getPayouts,
    getPayoutStats
  };
}

/**
 * Custom hook for commission operations
 */
export function useCommissionAPI() {
  const { setLoading, setError, showSuccess, showError, setCommissionSettings } = usePayment();

  const getAuthHeaders = useCallback(() => {
    const token = sessionStorage.getItem('changanet_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Get commission settings
  const getCommissionSettings = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/commissions', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error obteniendo configuraciones de comisión');
      }

      const data = await response.json();
      setCommissionSettings(data.data || []);
      return data.data || [];
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, getAuthHeaders, setCommissionSettings]);

  // Create commission setting
  const createCommissionSetting = useCallback(async (settingData) => {
    setLoading(true);

    try {
      const response = await fetch('/api/commissions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creando configuración de comisión');
      }

      const data = await response.json();
      showSuccess('Configuración de comisión creada exitosamente');
      await getCommissionSettings(); // Refresh list
      return data;
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders, getCommissionSettings]);

  // Update commission setting
  const updateCommissionSetting = useCallback(async (settingId, settingData) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/commissions/${settingId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error actualizando configuración de comisión');
      }

      const data = await response.json();
      showSuccess('Configuración de comisión actualizada exitosamente');
      await getCommissionSettings(); // Refresh list
      return data;
    } catch (error) {
      setError(error.message);
      showError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, showSuccess, showError, getAuthHeaders, getCommissionSettings]);

  // Calculate commission
  const calculateCommission = useCallback(async (amount) => {
    try {
      const response = await fetch('/api/commissions/calculate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        throw new Error('Error calculando comisión');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [setError, getAuthHeaders]);

  return {
    getCommissionSettings,
    createCommissionSetting,
    updateCommissionSetting,
    calculateCommission
  };
}
