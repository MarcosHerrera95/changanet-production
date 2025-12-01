import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import { usePayoutAPI } from '../hooks/usePaymentAPI';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ui/ErrorAlert';

/**
 * EarningsSummary - Resumen de ganancias del profesional
 * Muestra ganancias por período con filtros y gráficos
 */
const EarningsSummary = ({ showFilters = true }) => {
  const { user } = useAuth();
  const { loading, error, clearError } = usePayment();
  const { getPayouts } = usePayoutAPI();

  const [earnings, setEarnings] = useState([]);
  const [filteredEarnings, setFilteredEarnings] = useState([]);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    totalCommissions: 0,
    netEarnings: 0,
    periodCount: 0
  });
  const [filters, setFilters] = useState({
    period: 'month', // 'week', 'month', 'quarter', 'year'
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });
  const [sortBy, setSortBy] = useState('period');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (user && (user.role === 'profesional' || user.rol === 'profesional')) {
      loadEarningsData();
    }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [earnings, filters, sortBy, sortOrder]);

  const loadEarningsData = async () => {
    try {
      const payouts = await getPayouts();
      if (payouts && Array.isArray(payouts)) {
        // Group payouts by period
        const groupedEarnings = groupEarningsByPeriod(payouts);
        setEarnings(groupedEarnings);
      } else {
        setEarnings([]);
      }
    } catch (err) {
      console.error('Error loading earnings data:', err);
      setEarnings([]);
    }
  };

  const groupEarningsByPeriod = (payouts) => {
    const grouped = {};

    payouts.forEach(payout => {
      if (payout.status === 'completed') {
        const date = new Date(payout.createdAt);
        let periodKey;

        switch (filters.period) {
          case 'week': {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
            break;
          }
          case 'month':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'quarter': {
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            periodKey = `${date.getFullYear()}-Q${quarter}`;
            break;
          }
          case 'year':
            periodKey = date.getFullYear().toString();
            break;
          default:
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!grouped[periodKey]) {
          grouped[periodKey] = {
            period: periodKey,
            totalEarnings: 0,
            totalCommissions: 0,
            netEarnings: 0,
            payoutCount: 0,
            payouts: []
          };
        }

        grouped[periodKey].totalEarnings += payout.amount || 0;
        grouped[periodKey].totalCommissions += payout.commission || 0;
        grouped[periodKey].netEarnings += payout.netAmount || (payout.amount - payout.commission) || 0;
        grouped[periodKey].payoutCount += 1;
        grouped[periodKey].payouts.push(payout);
      }
    });

    return Object.values(grouped);
  };

  const applyFiltersAndSorting = () => {
    let filtered = [...earnings];

    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(earning => {
        const periodDate = parsePeriodDate(earning.period);
        return periodDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(earning => {
        const periodDate = parsePeriodDate(earning.period);
        return periodDate <= toDate;
      });
    }

    // Apply amount filters
    if (filters.minAmount) {
      filtered = filtered.filter(earning => earning.netEarnings >= parseFloat(filters.minAmount));
    }

    if (filters.maxAmount) {
      filtered = filtered.filter(earning => earning.netEarnings <= parseFloat(filters.maxAmount));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'period') {
        aValue = parsePeriodDate(a.period);
        bValue = parsePeriodDate(b.period);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredEarnings(filtered);

    // Calculate summary
    const totalEarnings = filtered.reduce((sum, earning) => sum + earning.totalEarnings, 0);
    const totalCommissions = filtered.reduce((sum, earning) => sum + earning.totalCommissions, 0);
    const netEarnings = filtered.reduce((sum, earning) => sum + earning.netEarnings, 0);

    setSummary({
      totalEarnings,
      totalCommissions,
      netEarnings,
      periodCount: filtered.length
    });
  };

  const parsePeriodDate = (period) => {
    if (period.includes('-Q')) {
      // Quarter format: 2024-Q1
      const [year, quarter] = period.split('-Q');
      const month = (parseInt(quarter) - 1) * 3;
      return new Date(parseInt(year), month, 1);
    } else if (period.includes('-')) {
      // Month format: 2024-01
      const [year, month] = period.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    } else {
      // Year format: 2024
      return new Date(parseInt(period), 0, 1);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePeriodChange = (period) => {
    setFilters(prev => ({
      ...prev,
      period
    }));
  };

  const clearFilters = () => {
    setFilters({
      period: 'month',
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatPeriod = (period) => {
    if (period.includes('-Q')) {
      const [year, quarter] = period.split('-Q');
      return `Q${quarter} ${year}`;
    } else if (period.includes('-')) {
      const [year, month] = period.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                         'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    } else {
      return period;
    }
  };

  if (!user || (user.role !== 'profesional' && user.rol !== 'profesional')) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Debes iniciar sesión como profesional para ver tu resumen de ganancias.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Resumen de Ganancias</h2>
        <p className="text-gray-600 mt-1">
          Revisa tus ingresos por período de tiempo.
        </p>
      </div>

      <ErrorAlert message={error} onClose={clearError} className="mb-6" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-600">Ganancias Brutas</p>
          <p className="text-xl font-bold text-green-900">{formatCurrency(summary.totalEarnings)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-red-600">Comisiones</p>
          <p className="text-xl font-bold text-red-900">{formatCurrency(summary.totalCommissions)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-600">Ganancias Netas</p>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(summary.netEarnings)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Períodos</p>
          <p className="text-xl font-bold text-gray-900">{summary.periodCount}</p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                name="period"
                value={filters.period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
              >
                <option value="week">Semanal</option>
                <option value="month">Mensual</option>
                <option value="quarter">Trimestral</option>
                <option value="year">Anual</option>
              </select>
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

      {/* Chart Placeholder */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tendencia de Ganancias</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-gray-600">Gráfico de ganancias por período</p>
            <p className="text-sm text-gray-500 mt-1">Instalar recharts para gráficos interactivos</p>
          </div>
        </div>
      </div>

      {/* Earnings Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" message="Cargando resumen de ganancias..." />
        </div>
      ) : filteredEarnings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No hay ganancias en este período
          </h3>
          <p className="text-gray-600">
            Las ganancias aparecerán aquí cuando completes servicios.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('period')}
                >
                  Período {sortBy === 'period' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagos
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalEarnings')}
                >
                  Bruto {sortBy === 'totalEarnings' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comisión
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('netEarnings')}
                >
                  Neto {sortBy === 'netEarnings' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEarnings.map((earning, index) => (
                <tr key={earning.period || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatPeriod(earning.period)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {earning.payoutCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(earning.totalEarnings)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(earning.totalCommissions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(earning.netEarnings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EarningsSummary;
