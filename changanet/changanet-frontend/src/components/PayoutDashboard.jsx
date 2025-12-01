import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import { usePayoutAPI, useWithdrawalAPI, useBankAccountAPI } from '../hooks/usePaymentAPI';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ui/ErrorAlert';

/**
 * PayoutDashboard - Dashboard completo para profesionales
 * Muestra métricas, gráficos y acciones de pagos
 */
const PayoutDashboard = () => {
  const { user } = useAuth();
  const { loading, error, clearError } = usePayment();
  const { getPayouts, getPayoutStats } = usePayoutAPI();
  const { getAvailableFunds } = useWithdrawalAPI();
  const { getBankAccounts } = useBankAccountAPI();

  const [stats, setStats] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayouts: 0,
    completedServices: 0,
    monthlyEarnings: [],
    payoutStatusDistribution: []
  });
  const [recentPayouts, setRecentPayouts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  useEffect(() => {
    if (user && (user.role === 'profesional' || user.rol === 'profesional')) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load stats
      const statsData = await getPayoutStats();
      if (statsData) {
        setStats(prev => ({
          ...prev,
          totalEarnings: statsData.totalEarnings || 0,
          availableBalance: statsData.availableBalance || 0,
          pendingPayouts: statsData.pendingPayouts || 0,
          completedServices: statsData.completedServices || 0
        }));
      }

      // Load recent payouts
      const payouts = await getPayouts();
      if (payouts) {
        setRecentPayouts(payouts.slice(0, 5)); // Last 5 payouts
      }

      // Load available funds
      const fundsData = await getAvailableFunds();
      if (fundsData) {
        setStats(prev => ({
          ...prev,
          availableBalance: fundsData.availableBalance || prev.availableBalance
        }));
      }

      // Load bank accounts
      const accounts = await getBankAccounts();
      setBankAccounts(accounts || []);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  if (!user || (user.role !== 'profesional' && user.rol !== 'profesional')) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Debes iniciar sesión como profesional para ver tu dashboard de pagos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de Pagos</h2>
        <p className="text-gray-600 mt-1">
          Gestiona tus ingresos y retiros de forma segura.
        </p>
      </div>

      <ErrorAlert message={error} onClose={clearError} className="mb-6" />

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ganancias Totales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🏦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Saldo Disponible</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.availableBalance)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pagos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayouts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Servicios Completados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedServices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de ganancias mensuales */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ganancias Mensuales</h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600">Gráfico de ganancias mensuales</p>
                <p className="text-sm text-gray-500 mt-1">Instalar recharts para gráficos interactivos</p>
              </div>
            </div>
          )}
        </div>

        {/* Distribución de estados de pago */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estado de Pagos</h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">🥧</div>
                <p className="text-gray-600">Distribución por estado</p>
                <p className="text-sm text-gray-500 mt-1">Instalar recharts para gráficos interactivos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            className="flex items-center justify-center px-4 py-3 bg-[#E30613] text-white rounded-lg hover:bg-[#C9050F] transition-colors"
            disabled={stats.availableBalance === 0}
          >
            <span className="mr-2">💸</span>
            Solicitar Retiro
          </button>

          <button className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <span className="mr-2">🏦</span>
            Gestionar Cuentas ({bankAccounts.length})
          </button>

          <button className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            <span className="mr-2">📄</span>
            Ver Transacciones
          </button>
        </div>
      </div>

      {/* Pagos recientes */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pagos Recientes</h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : recentPayouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No hay pagos aún</h3>
            <p className="text-gray-600">
              Los pagos aparecerán aquí cuando completes servicios.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentPayouts.map((payout) => (
              <div key={payout.id} className="px-6 py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Pago #{payout.id}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                        {getStatusText(payout.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {payout.description || 'Pago por servicios'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Fecha: {formatDate(payout.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(payout.amount)}
                    </p>
                    {payout.commission && (
                      <p className="text-sm text-gray-600">
                        Comisión: {formatCurrency(payout.commission)}
                      </p>
                    )}
                    {payout.netAmount && (
                      <p className="text-sm font-medium text-green-600">
                        Neto: {formatCurrency(payout.netAmount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutDashboard;
