import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MisCotizacionesCliente from './MisCotizacionesCliente';
import './MiCuentaCliente.css';

// Componente funcional para el panel de "Mi Cuenta" del cliente en Changánet
const MiCuentaCliente = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Estado para almacenar la información del cliente
  const [cliente, setCliente] = useState({
    nombre: '',
    serviciosContratados: 0,
    cotizacionesRecibidas: 0,
    notificaciones: 0,
    loading: true,
    error: null
  });

  // Estado para controlar el modal de cotizaciones
  const [showCotizacionesModal, setShowCotizacionesModal] = useState(false);

  // Función para cargar datos del dashboard
  const fetchDashboardData = async () => {
    try {
      setCliente(prev => ({ ...prev, loading: true, error: null }));
      
      const token = localStorage.getItem('changanet_token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Cargar datos del perfil
      const profileResponse = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setCliente(prev => ({
          ...prev,
          nombre: profileData.usuario?.nombre || user?.nombre || 'Usuario',
          loading: false
        }));
      } else {
        setCliente(prev => ({
          ...prev,
          nombre: user?.nombre || 'Usuario',
          loading: false,
          error: 'Error al cargar el perfil'
        }));
      }
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      setCliente(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        nombre: user?.nombre || 'Usuario'
      }));
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Función para manejar la redirección a buscar profesionales
  const handleSearchProfessionals = () => {
    navigate('/');
  };

  // Función para manejar la redirección a editar perfil
  const handleEditProfile = () => {
    navigate('/mi-perfil-cliente');
  };

  // Función para manejar la redirección a gestionar cotizaciones
  const handleManageQuotes = () => {
    // Abrir el modal de cotizaciones
    setShowCotizacionesModal(true);
  };

  // Función para cerrar el modal de cotizaciones
  const handleCloseCotizacionesModal = () => {
    setShowCotizacionesModal(false);
  };

  // Función para manejar la navegación al perfil
  const handleViewProfile = () => {
    navigate('/perfil');
  };

  // Mostrar loading
  if (cliente.loading) {
    return (
      <div className="mi-cuenta-cliente-container">
        <div className="mi-cuenta-card">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando información...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mi-cuenta-cliente-container">
      <div className="mi-cuenta-card">
        <h2>Mi Cuenta</h2>
        
        {cliente.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            {cliente.error}
            <button 
              onClick={fetchDashboardData}
              className="ml-2 text-red-800 underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="saludo">
          <h3>¡Hola, {cliente.nombre || 'Usuario'}!</h3>
          <p>¿Qué necesitas hoy?</p>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <span>{cliente.serviciosContratados}</span>
            <p>Servicios contratados</p>
          </div>
          <div className="stat-card">
            <span>{cliente.cotizacionesRecibidas}</span>
            <p>Cotizaciones recibidas</p>
          </div>
          <div className="stat-card">
            <span>{cliente.notificaciones}</span>
            <p>Notificaciones</p>
          </div>
        </div>

        <div className="acciones-rapidas">
          <button onClick={handleSearchProfessionals} className="accion-btn buscar-profesionales" aria-label="Buscar profesionales - Encuentra el servicio que necesitas">
            Buscar Profesionales<br/>
            <small>Encuentra el servicio que necesitas</small>
          </button>
          <button onClick={handleEditProfile} className="accion-btn mi-perfil" aria-label="Mi perfil - Gestiona tu información">
            Mi Perfil<br/>
            <small>Gestiona tu información</small>
          </button>
          <button onClick={handleManageQuotes} className="accion-btn mis-cotizaciones" aria-label="Mis cotizaciones - Revisa tus solicitudes">
            Mis Cotizaciones<br/>
            <small>Revisa tus solicitudes</small>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button 
            onClick={handleViewProfile}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Ver Perfil Completo
          </button>
        </div>
      </div>

      {/* Modal de Cotizaciones */}
      {showCotizacionesModal && (
        <MisCotizacionesCliente onClose={handleCloseCotizacionesModal} />
      )}
    </div>
  );
};

export default MiCuentaCliente;
