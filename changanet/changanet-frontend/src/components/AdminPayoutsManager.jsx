import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ui/ErrorAlert';

/**
 * AdminPayoutsManager - Gestión administrativa de payouts
 * Solo accesible para administradores
 */
const AdminPayoutsManager = () => {
  const { user } = useAuth();
  const { loading, error, clearError } = usePayment();

  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState({
    totalPayouts: 0,
    pendingPayouts: 0,
    processedPayouts: 0,
    totalAmount: 0,
    pendingAmount: 0,
    processedAmount: 0
  });
  const [filters, setFilters] = useState({
    status: 'pending', // Focus on pending by default
    professionalId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [processingPayout, setProcessingPayout] = useState(null);
  const [selectedPayouts, setSelectedPayouts] = useState([]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.rol === 'admin')) {
      loadPayouts();
      loadStats();
    }
  }, [user, filters]);

  const loadPayouts = async () => {
    try {
      // In a real implementation, this would call admin API endpoints
      // For now, we'll simulate loading payouts data
      const mockPayouts = [
        {
          id: 'payout_001',
          professionalId: 'prof_001',
          professionalName: 'María González',
          amount: 2375,
          status: 'pending',
          createdAt: '2025-01-15T12:00:00Z',
          paymentIds: ['pay_001'],
          bankAccount: {
            bankName: 'Banco Nación',
            accountNumber: '****1234'
          }
        },
        {
          id: 'payout_002',
          professionalId: 'prof_002',
          professionalName: 'Carlos Rodríguez',
          amount: 1710,
          status: 'pending',
          createdAt: '2025-01-20T16:30:00Z',
          paymentIds: ['pay_002'],
          bankAccount: {
            bankName: 'Banco Provincia',
            accountNumber: '****5678'
          }
        },
        {
          id: 'payout_003',
          professionalId: 'prof_003',
          professionalName: 'Pedro Martínez',
          amount: 3040,
          status: 'processed',
          createdAt: '2025-01-25T11:15:00Z',
          processedAt: '2025-01-26T09:00:00Z',
          paymentIds: ['pay_003'],
          bankAccount: {
            bankName: 'Banco Santander',
            accountNumber: '****9012'
          }
        }
      ];

      let filtered = mockPayouts;

      // Apply filters
      if (filters.status) {
        filtered = filtered.filter(payout => payout.status === filters.status);
      }

      if (filters.professionalId) {
        filtered = filtered.filter(payout =>
          payout.professionalId?.toLowerCase().includes(filters.professionalId.toLowerCase()) ||
          payout.professionalName?.toLowerCase().includes(filters.professionalId.toLowerCase())
        );
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filtered = filtered.filter(payout => new Date(payout.createdAt) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        filtered = filtered.filter(payout => new Date(payout.createdAt) <= toDate);
      }

      setPayouts(filtered);
    } catch (err) {
      console.error('Error loading payouts:', err);
    }
  };

  const loadStats = async () => {
    try {
      // Mock stats - in real implementation, this would come from API
      const mockStats = {
        totalPayouts: 15,
        pendingPayouts: 8,
        processedPayouts: 7,
        totalAmount: 45250,
        pendingAmount: 21500,
        processedAmount: 23750
      };

      setStats(mockStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProcessPayout = async (payoutId) => {
    try {
      setProcessingPayout(payoutId);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update local state
      setPayouts(prev => prev.map(payout =>
        payout.id === payoutId
          ? {
              ...payout,
              status: 'processed',
              processedAt: new Date().toISOString()
            }
          : payout
      ));

      // Update stats
      setStats(prev => ({
        ...prev,
        pendingPayouts: prev.pendingPayouts - 1,
        processedPayouts: prev.processedPayouts + 1,
        pendingAmount: prev.pendingAmount - payouts.find(p => p.id === payoutId)?.amount || 0,
        processedAmount: prev.processedAmount + (payouts.find(p => p.id === payoutId)?.amount || 0)
      }));

    } catch (err) {
      console.error('Error processing payout:', err);
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleBulkProcess = async () => {
    if (selectedPayouts.length === 0) return;

    try {
      setProcessingPayout('bulk');

      // Process selected payouts
      for (const payoutId of selectedPayouts) {
        await handleProcessPayout(payoutId);
      }

      setSelectedPayouts([]);
    } catch (err) {
      console.error('Error processing bulk payouts:', err);
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleSelectPayout = (payoutId) => {
    setSelectedPayouts(prev =>
      prev.includes(payoutId)
        ? prev.filter(id => id !== payoutId)
        : [...prev, payoutId]
    );
  };

  const handleSelectAll = () => {
    const pendingPayoutIds = payouts
      .filter(payout => payout.status === 'pending')
      .map(payout => payout.id);

    setSelectedPayouts(
      selectedPayouts.length === pendingPayoutIds.length
        ? []
        : pendingPayoutIds
    );
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'processed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'processed': return 'Procesado';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  if (!user || (user.role !== 'admin' && user.rol !== 'admin')) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Acceso denegado. Solo administradores pueden gestionar payouts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Payouts</h2>
        <p className="text-gray-600 mt-1">
          Administra los pagos a profesionales del sistema.
        </p>
      </div>

      <ErrorAlert message={error} onClose={clearError} className="mb-6" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Payouts Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayouts}</p>
              <p className="text-sm text-gray-500">{formatCurrency(stats.pendingAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Payouts Procesados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.processedPayouts}</p>
              <p className="text-sm text-gray-500">{formatCurrency(stats.processedAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monto Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              <p className="text-sm text-gray-500">{stats.totalPayouts} payouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {payouts.filter(p => p.status === 'pending').length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedPayouts.length === payouts.filter(p => p.status === 'pending').length && selectedPayouts.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
                />
                <span className="ml-2 text-sm text-gray-700">Seleccionar todos los pendientes</span>
              </label>
              {selectedPayouts.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedPayouts.length} payout{selectedPayouts.length !== 1 ? 's' : ''} seleccionado{selectedPayouts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {selectedPayouts.length > 0 && (
              <button
                onClick={handleBulkProcess}
                disabled={processingPayout === 'bulk'}
                className="bg-[#E30613] text-white px-4 py-2 rounded-lg hover:bg-[#C9050F] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {processingPayout === 'bulk' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  `Procesar ${selectedPayouts.length} payout${selectedPayouts.length !== 1 ? 's' : ''}`
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="processing">Procesando</option>
              <option value="processed">Procesado</option>
              <option value="failed">Fallido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profesional
            </label>
            <input
              type="text"
              name="professionalId"
              value={filters.professionalId}
              onChange={handleFilterChange}
              placeholder="ID o nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Payouts List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Payouts ({payouts.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" message="Cargando payouts..." />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No hay payouts</h3>
            <p className="text-gray-600">
              No se encontraron payouts con los filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {payouts.map((payout) => (
              <div key={payout.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {payout.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedPayouts.includes(payout.id)}
                        onChange={() => handleSelectPayout(payout.id)}
                        className="mt-1 rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          Payout #{payout.id}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                          {getStatusText(payout.status)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mt-1">
                        Profesional: {payout.professionalName}
                      </p>

                      <p className="text-sm text-gray-600">
                        Fecha: {formatDate(payout.createdAt)}
                        {payout.processedAt && ` | Procesado: ${formatDate(payout.processedAt)}`}
                      </p>

                      <p className="text-sm text-gray-600">
                        Banco: {payout.bankAccount?.bankName} - {payout.bankAccount?.accountNumber}
                      </p>

                      <p className="text-sm text-gray-600">
                        Pagos incluidos: {payout.paymentIds?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(payout.amount)}
                    </p>

                    {payout.status === 'pending' && (
                      <button
                        onClick={() => handleProcessPayout(payout.id)}
                        disabled={processingPayout === payout.id}
                        className="mt-2 bg-[#E30613] text-white px-3 py-1 rounded text-sm hover:bg-[#C9050F] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {processingPayout === payout.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Procesando...
                          </>
                        ) : (
                          'Procesar Payout'
                        )}
                      </button>
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

export default AdminPayoutsManager;
