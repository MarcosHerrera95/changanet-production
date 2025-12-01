import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilters, setUserFilters] = useState({ page: 1, search: '', role: '', blocked: '' });
  const [serviceFilters, setServiceFilters] = useState({ page: 1, search: '', status: '', urgent: '' });

  useEffect(() => {
    if (user && user.rol === 'admin') {
      loadDashboardData();
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'services') {
      loadServices();
    }
  }, [activeTab, userFilters, serviceFilters]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, verificationsRes] = await Promise.all([
        fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
        }),
        fetch('/api/admin/verifications/pending', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (verificationsRes.ok) {
        const verificationsData = await verificationsRes.json();
        setPendingVerifications(verificationsData.data);
      }
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams(userFilters);
      const response = await fetch(`/api/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadServices = async () => {
    try {
      const params = new URLSearchParams(serviceFilters);
      const response = await fetch(`/api/admin/services?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data.data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleApproveVerification = async (requestId) => {
    try {
      const response = await fetch(`/api/admin/verifications/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });

      if (response.ok) {
        alert('Verificación aprobada exitosamente');
        loadDashboardData(); // Recargar datos
      } else {
        alert('Error al aprobar verificación');
      }
    } catch (error) {
      console.error('Error approving verification:', error);
      alert('Error al aprobar verificación');
    }
  };

  const handleRejectVerification = async (requestId) => {
    const reason = prompt('Motivo del rechazo:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/admin/verifications/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({ motivo_rechazo: reason })
      });

      if (response.ok) {
        alert('Verificación rechazada');
        loadDashboardData(); // Recargar datos
      } else {
        alert('Error al rechazar verificación');
      }
    } catch (error) {
      console.error('Error rejecting verification:', error);
      alert('Error al rechazar verificación');
    }
  };

  const handleToggleUserBlock = async (userId, currentlyBlocked) => {
    const action = currentlyBlocked ? 'desbloquear' : 'bloquear';
    const reason = currentlyBlocked ? '' : prompt('Motivo del bloqueo:');
    if (!currentlyBlocked && !reason) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({ blocked: !currentlyBlocked, reason })
      });

      if (response.ok) {
        alert(`Usuario ${action}do exitosamente`);
        loadUsers();
      } else {
        alert(`Error al ${action} usuario`);
      }
    } catch (error) {
      console.error(`Error ${action}ndo usuario:`, error);
      alert(`Error al ${action} usuario`);
    }
  };

  const handleChangeUserRole = async (userId) => {
    const newRole = prompt('Nuevo rol (cliente/profesional/admin):');
    if (!newRole || !['cliente', 'profesional', 'admin'].includes(newRole)) {
      alert('Rol inválido. Debe ser: cliente, profesional o admin');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({ newRole })
      });

      if (response.ok) {
        alert('Rol del usuario cambiado exitosamente');
        loadUsers();
      } else {
        alert('Error al cambiar rol del usuario');
      }
    } catch (error) {
      console.error('Error cambiando rol del usuario:', error);
      alert('Error al cambiar rol del usuario');
    }
  };

  const handleUpdateServiceStatus = async (serviceId) => {
    const newStatus = prompt('Nuevo estado (PENDIENTE/AGENDADO/EN_PROCESO/COMPLETADO/CANCELADO):');
    const validStatuses = ['PENDIENTE', 'AGENDADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      alert(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
      return;
    }

    try {
      const response = await fetch(`/api/admin/services/${serviceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        alert('Estado del servicio actualizado exitosamente');
        loadServices();
      } else {
        alert('Error al actualizar estado del servicio');
      }
    } catch (error) {
      console.error('Error actualizando estado del servicio:', error);
      alert('Error al actualizar estado del servicio');
    }
  };

  const tabs = [
    { id: 'overview', name: 'Resumen', icon: '📊' },
    { id: 'verifications', name: 'Verificaciones', icon: '✅' },
    { id: 'users', name: 'Usuarios', icon: '👥' },
    { id: 'services', name: 'Servicios', icon: '🔧' },
    { id: 'payments', name: 'Pagos', icon: '💳' },
    { id: 'disputes', name: 'Disputas', icon: '⚖️' },
    { id: 'content', name: 'Contenido', icon: '📝' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    { id: 'settings', name: 'Configuración', icon: '⚙️' }
  ];

  if (!user || user.rol !== 'admin') {
    return <div>No tienes permisos para acceder a esta página</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="mt-2 text-gray-600">Gestiona usuarios, verificaciones y pagos de la plataforma</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Usuarios Verificados</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.users.verified}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Verificaciones Pendientes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.users.pendingVerifications}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                    <p className="text-2xl font-bold text-gray-900">${stats.payments.totalRevenue}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verifications' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Solicitudes de Verificación Pendientes</h2>

              {pendingVerifications.length === 0 ? (
                <p className="text-gray-600">No hay solicitudes pendientes</p>
              ) : (
                <div className="space-y-4">
                  {pendingVerifications.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{request.usuario.nombre}</h3>
                          <p className="text-gray-600">{request.usuario.email}</p>
                          <p className="text-sm text-gray-500">
                            Solicitado: {new Date(request.fecha_solicitud).toLocaleDateString()}
                          </p>
                          {request.documento_url && (
                            <a
                              href={request.documento_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Ver documento
                            </a>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveVerification(request.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleRejectVerification(request.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Gestión de Usuarios</h2>

              {/* Filtros */}
              <div className="mb-4 flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={userFilters.search}
                  onChange={(e) => setUserFilters({...userFilters, search: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <select
                  value={userFilters.role}
                  onChange={(e) => setUserFilters({...userFilters, role: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos los roles</option>
                  <option value="cliente">Cliente</option>
                  <option value="profesional">Profesional</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={userFilters.blocked}
                  onChange={(e) => setUserFilters({...userFilters, blocked: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos los estados</option>
                  <option value="false">Activos</option>
                  <option value="true">Bloqueados</option>
                </select>
                <button
                  onClick={loadUsers}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Buscar
                </button>
              </div>

              {/* Lista de usuarios */}
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold">{user.nombre}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.rol === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.rol === 'profesional' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.rol}
                          </span>
                          {user.esta_verificado && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Verificado
                            </span>
                          )}
                          {user.bloqueado && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">{user.email}</p>
                        <p className="text-gray-500 text-xs">
                          Creado: {new Date(user.creado_en).toLocaleDateString()}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Servicios: {user._count.servicios_como_cliente} como cliente, {user._count.servicios_como_profesional} como profesional
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleUserBlock(user.id, user.bloqueado)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            user.bloqueado
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {user.bloqueado ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        <button
                          onClick={() => handleChangeUserRole(user.id)}
                          className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Cambiar Rol
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Gestión de Servicios</h2>

              {/* Filtros */}
              <div className="mb-4 flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Buscar servicios..."
                  value={serviceFilters.search}
                  onChange={(e) => setServiceFilters({...serviceFilters, search: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <select
                  value={serviceFilters.status}
                  onChange={(e) => setServiceFilters({...serviceFilters, status: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos los estados</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="AGENDADO">Agendado</option>
                  <option value="EN_PROCESO">En Proceso</option>
                  <option value="COMPLETADO">Completado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
                <select
                  value={serviceFilters.urgent}
                  onChange={(e) => setServiceFilters({...serviceFilters, urgent: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos</option>
                  <option value="true">Urgentes</option>
                  <option value="false">Normales</option>
                </select>
                <button
                  onClick={loadServices}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Buscar
                </button>
              </div>

              {/* Lista de servicios */}
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold">Servicio #{service.id}</h3>
                          {service.es_urgente && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              🚨 URGENTE
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            service.estado === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                            service.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                            service.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {service.estado}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-1">{service.descripcion}</p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Cliente:</strong> {service.cliente.nombre} ({service.cliente.email})</p>
                          <p><strong>Profesional:</strong> {service.profesional.nombre} ({service.profesional.email})</p>
                          {service.pago && (
                            <p><strong>Pago:</strong> ${service.pago.monto_total} - {service.pago.estado}</p>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-2">
                          Creado: {new Date(service.creado_en).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => handleUpdateServiceStatus(service.id)}
                          className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Cambiar Estado
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Resumen Financiero */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <span className="text-2xl">💰</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                      <p className="text-2xl font-bold text-gray-900">${stats?.payments?.totalRevenue || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <span className="text-2xl">🏦</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Comisiones</p>
                      <p className="text-2xl font-bold text-gray-900">${stats?.payments?.totalCommissions || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <span className="text-2xl">⏳</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pendientes de Retiro</p>
                      <p className="text-2xl font-bold text-gray-900">${stats?.payments?.pendingWithdrawals || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pagos en Disputa</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.payments?.disputedPayments || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gestión de Retiros */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Solicitudes de Retiro Pendientes</h3>
                
                <div className="space-y-4">
                  {/* Ejemplo de solicitudes de retiro */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold">Carlos Rodriguez</h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pendiente
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Monto:</strong> $450.00</p>
                          <p><strong>Método:</strong> Transferencia Bancaria</p>
                          <p><strong>Solicitado:</strong> 18 Nov 2025, 14:30</p>
                          <p><strong>Datos bancarios:</strong> Banco Santander ****1234</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                          Aprobar
                        </button>
                        <button className="px-3 py-1 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700">
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold">María González</h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pendiente
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Monto:</strong> $320.50</p>
                          <p><strong>Método:</strong> Mercado Pago</p>
                          <p><strong>Solicitado:</strong> 17 Nov 2025, 16:45</p>
                          <p><strong>Email:</strong> maria.gonzalez@email.com</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                          Aprobar
                        </button>
                        <button className="px-3 py-1 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700">
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagos Recientes */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Transacciones Recientes</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Profesional</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Monto</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm">#12345</td>
                        <td className="py-3 px-4 text-sm">Juan Pérez</td>
                        <td className="py-3 px-4 text-sm">Carlos Rodriguez</td>
                        <td className="py-3 px-4 text-sm">$150.00</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completado
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">18 Nov 2025</td>
                        <td className="py-3 px-4">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm">#12344</td>
                        <td className="py-3 px-4 text-sm">Ana López</td>
                        <td className="py-3 px-4 text-sm">María González</td>
                        <td className="py-3 px-4 text-sm">$89.99</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Procesando
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">17 Nov 2025</td>
                        <td className="py-3 px-4">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm">#12343</td>
                        <td className="py-3 px-4 text-sm">Pedro Martín</td>
                        <td className="py-3 px-4 text-sm">Luis Fernández</td>
                        <td className="py-3 px-4 text-sm">$210.75</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            En disputa
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">16 Nov 2025</td>
                        <td className="py-3 px-4">
                          <button className="text-red-600 hover:text-red-800 text-sm">
                            Revisar disputa
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Configuración de Comisiones */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Configuración de Comisiones</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comisión Estándar (%)
                    </label>
                    <input
                      type="number"
                      defaultValue="8"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comisión aplicada a la mayoría de servicios</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comisión Urgente (%)
                    </label>
                    <input
                      type="number"
                      defaultValue="10"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comisión aplicada a servicios urgentes</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto Mínimo de Retiro ($)
                    </label>
                    <input
                      type="number"
                      defaultValue="50"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Monto mínimo para procesar retiros</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Días para Liberación de Fondos
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="1">1 día</option>
                      <option value="3" selected>3 días</option>
                      <option value="7">7 días</option>
                      <option value="14">14 días</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Tiempo de espera antes de liberar fondos</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'disputes' && (
            <div className="space-y-6">
              {/* Resumen de Disputas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Disputas Activas</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.disputes?.active || 0}</p>
                      <p className="text-xs text-yellow-600">Requieren atención inmediata</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <span className="text-2xl">⚠️</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Resueltas este Mes</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.disputes?.resolved || 0}</p>
                      <p className="text-xs text-green-600">+15% vs mes anterior</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <span className="text-2xl">✅</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.disputes?.avgResolutionTime || 0}h</p>
                      <p className="text-xs text-blue-600">Para resolución</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <span className="text-2xl">⏱️</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Disputas */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Disputas Recientes</h3>
                
                {/* Filtros */}
                <div className="mb-6 flex flex-wrap gap-4">
                  <select className="px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">Todos los estados</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_REVISION">En Revisión</option>
                    <option value="RESUELTO">Resuelto</option>
                  </select>
                  
                  <select className="px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">Todas las categorías</option>
                    <option value="CALIDAD_SERVICIO">Calidad del Servicio</option>
                    <option value="PAGO">Problema de Pago</option>
                    <option value="CANCELACION">Cancelación</option>
                    <option value="COMPORTAMIENTO">Comportamiento</option>
                  </select>
                  
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Filtrar
                  </button>
                </div>

                {/* Lista de disputas */}
                <div className="space-y-4">
                  {/* Ejemplo de disputa */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold">Servicio #SERV-2024-156</h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ Pendiente
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Calidad del Servicio
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1 mb-3">
                          <p><strong>Cliente:</strong> Juan Pérez (jperez@email.com)</p>
                          <p><strong>Profesional:</strong> Carlos Rodríguez (crodriguez@email.com)</p>
                          <p><strong>Descripción:</strong> El trabajo de plomería no se completó correctamente, hay fugas en las tuberías</p>
                          <p><strong>Monto en disputa:</strong> $150.00</p>
                          <p><strong>Fecha:</strong> 18 Nov 2025, 10:30 AM</p>
                          <p><strong>Días transcurridos:</strong> 1 día</p>
                        </div>

                        {/* Evidencias */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-2">Evidencias Adjuntas:</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">📷 Fotos (3)</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">💬 Chat completo</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        <button className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                          Revisar Caso
                        </button>
                        <button className="px-3 py-1 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                          Resolver a favor del Cliente
                        </button>
                        <button className="px-3 py-1 rounded text-sm font-medium bg-purple-600 text-white hover:bg-purple-700">
                          Resolver a favor del Profesional
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold">Servicio #SERV-2024-142</h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            🔄 En Revisión
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Problema de Pago
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1 mb-3">
                          <p><strong>Cliente:</strong> Ana López (ana.lopez@email.com)</p>
                          <p><strong>Profesional:</strong> María González (maria.g@email.com)</p>
                          <p><strong>Descripción:</strong> El cliente afirma haber pagado pero el profesional no recibió el dinero</p>
                          <p><strong>Monto en disputa:</strong> $89.99</p>
                          <p><strong>Fecha:</strong> 16 Nov 2025, 3:15 PM</p>
                          <p><strong>Días transcurridos:</strong> 3 días</p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-2">Evidencias Adjuntas:</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">💳 Comprobante de pago</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">📧 Emails</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        <button className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                          Ver Evidencias
                        </button>
                        <button className="px-3 py-1 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                          Contactar Medios de Pago
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario de Resolución de Disputa */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Resolver Disputa</h3>
                <p className="text-gray-600 mb-6">Selecciona una disputa de la lista superior para ver detalles y proceder con la resolución.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decisión
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="">Seleccionar decisión</option>
                      <option value="CLIENTE">A favor del Cliente</option>
                      <option value="PROFESIONAL">A favor del Profesional</option>
                      <option value="PARCIAL">Acuerdo Parcial</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reembolso (si aplica)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comentarios de la Resolución
                    </label>
                    <textarea
                      rows="4"
                      placeholder="Explicar la decisión y el razonamiento..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    ></textarea>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">
                    Emitir Resolución
                  </button>
                  <button className="ml-3 bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors">
                    Guardar Borrador
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Blog y Contenido */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Gestión de Blog y Contenido</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Nuevo Artículo
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">Guía Completa: Cómo Contratar un Plomero</h4>
                        <p className="text-sm text-gray-600 mb-2">Guía práctica para encontrar y contratar plomeros profesionales en tu área.</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>📅 18 Nov 2025</span>
                          <span>👤 Admin</span>
                          <span>👁️ 1,234 vistas</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Publicado</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                        <button className="text-green-600 hover:text-green-800 text-sm">Ver</button>
                        <button className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">Seguridad Eléctrica: Tips Importantes</h4>
                        <p className="text-sm text-gray-600 mb-2">Consejos esenciales para mantener la seguridad eléctrica en tu hogar.</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>📅 15 Nov 2025</span>
                          <span>👤 Maria Admin</span>
                          <span>👁️ 892 vistas</span>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Borrador</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                        <button className="text-green-600 hover:text-green-800 text-sm">Publicar</button>
                        <button className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preguntas Frecuentes */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Preguntas Frecuentes</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Nueva FAQ
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">¿Cómo funciona el sistema de verificación?</h4>
                        <p className="text-sm text-gray-600">Proceso detallado de verificación de identidad para profesionales...</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                        <button className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comunicados del Sistema */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Comunicados del Sistema</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Nuevo Comunicado
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">Mantenimiento Programado</h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Activo</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">20 Nov 2025, 02:00 - 04:00</p>
                    <p className="text-sm text-gray-600">Mantenimiento de rutina del sistema</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">Nueva Funcionalidad</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Disponible</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Disponible ahora</p>
                    <p className="text-sm text-gray-600">Sistema de pagos mejorado</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Configuración General */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-6">Configuración General del Sistema</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Plataforma
                    </label>
                    <input
                      type="text"
                      defaultValue="Changánet"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de Soporte
                    </label>
                    <input
                      type="email"
                      defaultValue="soporte@changanet.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zona Horaria
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="America/Buenos_Aires">América/Buenos_Aires (UTC-3)</option>
                      <option value="America/Mexico_City">América/México (UTC-6)</option>
                      <option value="America/New_York">América/Nueva_York (UTC-5)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idioma Principal
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Configuración de Servicios */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-6">Configuración de Servicios</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium">Permitir Servicios Urgentes</h4>
                      <p className="text-sm text-gray-600">Habilita la opción de servicios urgentes para clientes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium">Solicitud de Presupuesto Obligatoria</h4>
                      <p className="text-sm text-gray-600">Los clientes deben enviar solicitud antes de contratar</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium">Chat Automático Habilitado</h4>
                      <p className="text-sm text-gray-600">Permite mensajería entre clientes y profesionales</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Configuración de Notificaciones */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-6">Configuración de Notificaciones</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Notificaciones del Sistema</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Nuevas Verificaciones</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Disputas Abiertas</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Reportes de Pago</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Alertas de Seguridad</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Intentos de Acceso Sospechosos</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Usuarios Bloqueados</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Actividad Administrativa</span>
                        <input type="checkbox" className="rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Respaldo y Mantenimiento */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-6">Respaldo y Mantenimiento</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">💾</span>
                    </div>
                    <h4 className="font-medium mb-2">Último Respaldo</h4>
                    <p className="text-sm text-gray-600">18 Nov 2025, 02:00</p>
                    <p className="text-xs text-green-600 mt-1">✅ Automático</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">🛠️</span>
                    </div>
                    <h4 className="font-medium mb-2">Estado del Sistema</h4>
                    <p className="text-sm text-gray-600">Funcionando</p>
                    <p className="text-xs text-blue-600 mt-1">🟢 Operativo</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h4 className="font-medium mb-2">Uso del Servidor</h4>
                    <p className="text-sm text-gray-600">CPU: 45%</p>
                    <p className="text-sm text-gray-600">RAM: 62%</p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-center space-x-4">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Forzar Respaldo
                  </button>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                    Descargar Respaldo
                  </button>
                  <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700">
                    Limpiar Cache
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Guardar Todas las Configuraciones
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Métricas Principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Servicios Completados</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.services?.completed || 0}</p>
                      <p className="text-xs text-green-600">↑ 12% vs mes anterior</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <span className="text-2xl">✅</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Calificación Promedio</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.ratings?.average || 0}/5</p>
                      <p className="text-xs text-blue-600">{stats?.ratings?.total || 0} reseñas</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <span className="text-2xl">⭐</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tasa de Conversión</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.conversion?.rate || 0}%</p>
                      <p className="text-xs text-purple-600">{stats?.conversion?.services} servicios</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <span className="text-2xl">📈</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráficos de Tendencias */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Tendencias de Servicios (Últimos 6 Meses)</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-600">Gráfico de tendencias integrado</p>
                    <p className="text-sm text-gray-500 mt-2">Mostrará datos de servicios por mes</p>
                  </div>
                </div>
              </div>

              {/* Distribución por Especialidades */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Servicios por Especialidad</h3>
                  <div className="space-y-3">
                    {stats?.services?.bySpecialty?.map((specialty, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{specialty.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${specialty.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{specialty.count}</span>
                        </div>
                      </div>
                    )) || (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Plomería</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                            </div>
                            <span className="text-sm text-gray-600">156</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Electricidad</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '28%' }}></div>
                            </div>
                            <span className="text-sm text-gray-600">124</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Albañilería</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '22%' }}></div>
                            </div>
                            <span className="text-sm text-gray-600">98</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Carpintería</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                            </div>
                            <span className="text-sm text-gray-600">67</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Actividad Reciente</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Nuevo usuario registrado</p>
                        <p className="text-xs text-gray-500">Hace 5 minutos</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Verificación aprobada</p>
                        <p className="text-xs text-gray-500">Hace 12 minutos</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Servicio completado</p>
                        <p className="text-xs text-gray-500">Hace 18 minutos</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Pago procesado</p>
                        <p className="text-xs text-gray-500">Hace 25 minutos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
