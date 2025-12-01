/**
 * @page ProfessionalPayments - Gestión de pagos y ganancias para profesionales
 * @descripción Historial de pagos, ganancias y retiros (REQ-41 a REQ-45)
 * @sprint Sprint 3 – Gestión Profesional
 * @tarjeta Tarjeta 9: [Frontend] Implementar Sistema de Pagos Profesionales
 * @impacto Económico: Transparencia financiera para profesionales independientes
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

const ProfessionalPayments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayments: 0,
    completedServices: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'profesional' || user.rol === 'profesional')) {
      loadPaymentsData();
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  const loadPaymentsData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('changanet_token');

      // Cargar estadísticas
      const statsResponse = await fetch('/api/professionals/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data || {
          totalEarnings: 0,
          availableBalance: 0,
          pendingPayments: 0,
          completedServices: 0
        });
      }

      // Cargar historial de pagos (simulado por ahora)
      // En una implementación real, esto vendría de una API de pagos
      setPayments([
        {
          id: 1,
          amount: 2500,
          status: 'completed',
          serviceId: 'SRV-001',
          clientName: 'María González',
          completedAt: '2025-01-15T10:00:00Z',
          commission: 125, // 5% de comisión
          netAmount: 2375
        },
        {
          id: 2,
          amount: 1800,
          status: 'in_custody',
          serviceId: 'SRV-002',
          clientName: 'Carlos Rodríguez',
          completedAt: '2025-01-20T14:30:00Z',
          commission: 90,
          netAmount: 1710
        }
      ]);

    } catch (err) {
      setError('Error al cargar los datos de pagos');
      console.error('Error loading payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    try {
      setWithdrawing(true);
      // Simular retiro - en implementación real esto llamaría a una API
      setTimeout(() => {
        setWithdrawing(false);
        // Actualizar balance disponible
        setStats(prev => ({
          ...prev,
          availableBalance: 0 // Asumiendo que retiró todo
        }));
      }, 2000);
    } catch (err) {
      setError('Error al procesar el retiro');
      setWithdrawing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_custody': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'in_custody': return 'En Custodia';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  if (!user || (user.role !== 'profesional' && user.rol !== 'profesional')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Pagos y Ganancias</h1>
          <p className="mt-2 text-gray-600">
            Gestiona tus ingresos y retiros de forma segura.
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ganancias Totales</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">🏦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Saldo Disponible</p>
                <p className="text-2xl font-bold text-gray-900">${stats.availableBalance}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pagos Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">${stats.pendingPayments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
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

        {/* Sección de retiro */}
        {stats.availableBalance > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Retirar Fondos</h3>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-green-800 font-medium">
                    Saldo disponible para retiro: <strong>${stats.availableBalance}</strong>
                  </p>
                  <p className="text-green-700 text-sm">
                    Los fondos se transferirán a tu cuenta bancaria registrada.
                  </p>
                </div>
                <button
                  onClick={handleWithdrawal}
                  disabled={withdrawing}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {withdrawing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    'Retirar Fondos'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Historial de pagos */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Historial de Pagos</h3>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E30613]"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No hay pagos aún</h3>
              <p className="text-gray-600">
                Los pagos aparecerán aquí cuando completes servicios.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <div key={payment.id} className="px-6 py-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          Servicio #{payment.serviceId}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {getStatusText(payment.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Cliente: {payment.clientName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Fecha: {new Date(payment.completedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ${payment.amount}
                      </p>
                      <p className="text-sm text-gray-600">
                        Comisión: ${payment.commission}
                      </p>
                      <p className="text-sm font-medium text-green-600">
                        Neto: ${payment.netAmount}
                      </p>
                    </div>
                  </div>

                  {payment.status === 'in_custody' && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-2">⏳</span>
                        <p className="text-sm text-yellow-800">
                          Fondos en custodia. Se liberarán automáticamente en 24 horas o cuando el cliente confirme el servicio.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información sobre el sistema de pagos */}
        <div className="mt-8 bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-3">¿Cómo funciona el sistema de pagos?</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Custodia de fondos:</strong> El dinero queda retenido hasta la confirmación del servicio.</p>
            <p>• <strong>Comisión de plataforma:</strong> Se cobra un 5% por transacción completada.</p>
            <p>• <strong>Retiros:</strong> Puedes retirar tus fondos disponibles en cualquier momento.</p>
            <p>• <strong>Transparencia:</strong> Recibes notificaciones de todos los movimientos.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalPayments;
