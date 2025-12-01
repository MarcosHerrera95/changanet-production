import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import { usePaymentAPI } from '../hooks/usePaymentAPI';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ui/ErrorAlert';
import PaymentStatusBadge from './ui/PaymentStatusBadge';

/**
 * AdminPaymentsTable - Tabla administrativa de todos los pagos del sistema
 * Solo accesible para administradores
 */
const AdminPaymentsTable = ({ showFilters = true }) => {
  const { user } = useAuth();
  const { loading, error, clearError } = usePayment();
  const { releaseFunds } = usePaymentAPI();

  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    professionalId: '',
    clientId: '',
    serviceId: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.rol === 'admin')) {
      loadPayments();
    }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [payments, filters, sortBy, sortOrder]);

  const loadPayments = async () => {
    try {
      // In a real implementation, this would call an admin API endpoint
      // For now, we'll simulate loading payments data
      const mockPayments = [
        {
          id: 'pay_001',
          amount: 2500,
          status: 'completed',
          serviceId: 'SRV-001',
          professionalId: 'prof_001',
          professionalName: 'María González',
          clientId: 'cli_001',
          clientName: 'Juan Pérez',
          description: 'Servicio de limpieza del hogar',
          createdAt: '2025-01-15T10:00:00Z',
          completedAt: '2025-01-15T12:00:00Z',
          commission: 125,
          netAmount: 2375,
          paymentMethod: 'mercado_pago'
        },
        {
          id: 'pay_002',
          amount: 1800,
          status: 'in_custody',
          serviceId: 'SRV-002',
          professionalId: 'prof_002',
          professionalName: 'Carlos Rodríguez',
          clientId: 'cli_002',
          clientName: 'Ana López',
          description: 'Reparación de electrodomésticos',
          createdAt: '2025-01-20T14:30:00Z',
          completedAt: null,
          commission: 90,
          netAmount: 1710,
          paymentMethod: 'mercado_pago'
        },
        {
          id: 'pay_003',
          amount: 3200,
          status: 'pending',
          serviceId: 'SRV-003',
          professionalId: 'prof_003',
          professionalName: 'Pedro Martínez',
          clientId: 'cli_003',
          clientName: 'Laura García',
          description: 'Jardinería y mantenimiento',
          createdAt: '2025-01-25T09:15:00Z',
          completedAt: null,
          commission: 160,
          netAmount: 3040,
          paymentMethod: 'mercado_pago'
        }
      ];

      setPayments(mockPayments);
    } catch (err) {
      console.error('Error loading payments:', err);
    }
  };

  const applyFiltersAndSorting = () => {
    let filtered = [...payments];

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter(payment => payment.status === filters.status);
    }

    if (filters.professionalId) {
      filtered = filtered.filter(payment =>
        payment.professionalId?.toLowerCase().includes(filters.professionalId.toLowerCase()) ||
        payment.professionalName?.toLowerCase().includes(filters.professionalId.toLowerCase())
      );
    }

    if (filters.clientId) {
      filtered = filtered.filter(payment =>
        payment.clientId?.toLowerCase().includes(filters.clientId.toLowerCase()) ||
        payment.clientName?.toLowerCase().includes(filters.clientId.toLowerCase())
      );
    }

    if (filters.serviceId) {
      filtered = filtered.filter(payment =>
        payment.serviceId?.toLowerCase().includes(filters.serviceId.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(payment => new Date(payment.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(payment => new Date(payment.createdAt) <= toDate);
    }

    if (filters.minAmount) {
      filtered = filtered.filter(payment => payment.amount >= parseFloat(filters.minAmount));
    }

    if (filters.maxAmount) {
      filtered = filtered.filter(payment => payment.amount <= parseFloat(filters.maxAmount));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPayments(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      professionalId: '',
      clientId: '',
      serviceId: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleReleaseFunds = async (paymentId) => {
    try {
      setProcessingPayment(paymentId);
      await releaseFunds(paymentId);

      // Update local state
      setPayments(prev => prev.map(payment =>
        payment.id === paymentId
          ? { ...payment, status: 'completed', completedAt: new Date().toISOString() }
          : payment
      ));
    } catch (err) {
      console.error('Error releasing funds:', err);
    } finally {
      setProcessingPayment(null);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!user || (user.role !== 'admin' && user.rol !== 'admin')) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Acceso denegado. Solo administradores pueden ver esta información.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Administración de Pagos</h2>
        <p className="text-gray-600 mt-1">
          Gestiona todos los pagos del sistema Changánet.
        </p>
      </div>

      <ErrorAlert message={error} onClose={clearError} className="mb-6" />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-600">Total Pagos</p>
          <p className="text-xl font-bold text-blue-900">{payments.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-600">Completados</p>
          <p className="text-xl font-bold text-green-900">
            {payments.filter(p => p.status === 'completed').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-yellow-600">En Custodia</p>
          <p className="text-xl font-bold text-yellow-900">
            {payments.filter(p => p.status === 'in_custody').length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-red-600">Monto Total</p>
          <p className="text-xl font-bold text-red-900">
            {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                <option value="in_custody">En Custodia</option>
                <option value="completed">Completado</option>
                <option value="failed">Fallido</option>
                <option value="cancelled">Cancelado</option>
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
                Cliente
              </label>
              <input
                type="text"
                name="clientId"
                value={filters.clientId}
                onChange={handleFilterChange}
                placeholder="ID o nombre..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servicio
              </label>
              <input
                type="text"
                name="serviceId"
                value={filters.serviceId}
                onChange={handleFilterChange}
                placeholder="ID del servicio..."
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Mínimo
              </label>
              <input
                type="number"
                name="minAmount"
                value={filters.minAmount}
                onChange={handleFilterChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Máximo
              </label>
              <input
                type="number"
                name="maxAmount"
                value={filters.maxAmount}
                onChange={handleFilterChange}
                placeholder="999999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 underline"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Payments Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" message="Cargando pagos..." />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {payments.length === 0 ? 'No hay pagos en el sistema' : 'No se encontraron pagos'}
          </h3>
          <p className="text-gray-600">
            {payments.length === 0
              ? 'Los pagos aparecerán aquí cuando los usuarios contraten servicios.'
              : 'Intenta ajustar los filtros de búsqueda.'
            }
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  Fecha {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profesional
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  Monto {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payment.serviceId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.clientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.professionalName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                      {payment.commission && (
                        <div className="text-xs text-gray-500">
                          Comisión: {formatCurrency(payment.commission)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-[#E30613] hover:text-[#C9050F] underline">
                        Ver detalle
                      </button>
                      {payment.status === 'in_custody' && (
                        <button
                          onClick={() => handleReleaseFunds(payment.id)}
                          disabled={processingPayment === payment.id}
                          className="text-green-600 hover:text-green-800 underline disabled:opacity-50"
                        >
                          {processingPayment === payment.id ? 'Liberando...' : 'Liberar fondos'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredPayments.length)} de {filteredPayments.length} pagos
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentsTable;
