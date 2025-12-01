import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import { useCommissionAPI } from '../hooks/usePaymentAPI';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ui/ErrorAlert';

/**
 * CommissionSettingsForm - Gestión de configuraciones de comisión
 * Solo accesible para administradores
 */
const CommissionSettingsForm = () => {
  const { user } = useAuth();
  const { loading, error, clearError } = usePayment();
  const { getCommissionSettings, createCommissionSetting, updateCommissionSetting } = useCommissionAPI();

  const [commissionSettings, setCommissionSettings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [formData, setFormData] = useState({
    rate: 5,
    minAmount: 0,
    maxAmount: null,
    effectiveFrom: '',
    effectiveTo: null,
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.rol === 'admin')) {
      loadCommissionSettings();
    }
  }, [user]);

  const loadCommissionSettings = async () => {
    try {
      const settings = await getCommissionSettings();
      if (settings) {
        setCommissionSettings(settings);
      }
    } catch (err) {
      console.error('Error loading commission settings:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.rate < 0 || formData.rate > 100) {
      alert('La tasa de comisión debe estar entre 0% y 100%');
      return;
    }

    if (formData.minAmount < 0) {
      alert('El monto mínimo no puede ser negativo');
      return;
    }

    if (formData.maxAmount !== null && formData.maxAmount <= formData.minAmount) {
      alert('El monto máximo debe ser mayor al monto mínimo');
      return;
    }

    try {
      setSaving(true);

      const settingData = {
        ...formData,
        effectiveFrom: formData.effectiveFrom || new Date().toISOString().split('T')[0],
        effectiveTo: formData.effectiveTo || null,
        maxAmount: formData.maxAmount || null
      };

      if (editingSetting) {
        await updateCommissionSetting(editingSetting.id, settingData);
      } else {
        await createCommissionSetting(settingData);
      }

      await loadCommissionSettings();
      resetForm();
    } catch (err) {
      console.error('Error saving commission setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (setting) => {
    setEditingSetting(setting);
    setFormData({
      rate: setting.rate,
      minAmount: setting.minAmount || 0,
      maxAmount: setting.maxAmount || '',
      effectiveFrom: setting.effectiveFrom ? setting.effectiveFrom.split('T')[0] : '',
      effectiveTo: setting.effectiveTo ? setting.effectiveTo.split('T')[0] : '',
      description: setting.description || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      rate: 5,
      minAmount: 0,
      maxAmount: null,
      effectiveFrom: '',
      effectiveTo: null,
      description: ''
    });
    setEditingSetting(null);
    setShowForm(false);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'Sin límite';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha límite';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (setting) => {
    const now = new Date();
    const effectiveFrom = new Date(setting.effectiveFrom);
    const effectiveTo = setting.effectiveTo ? new Date(setting.effectiveTo) : null;

    if (effectiveTo && now > effectiveTo) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Expirado</span>;
    } else if (now < effectiveFrom) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Programado</span>;
    } else {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>;
    }
  };

  if (!user || (user.role !== 'admin' && user.rol !== 'admin')) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Acceso denegado. Solo administradores pueden gestionar comisiones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Configuración de Comisiones</h2>
        <p className="text-gray-600 mt-1">
          Gestiona las tasas de comisión del sistema (5-10%).
        </p>
      </div>

      <ErrorAlert message={error} onClose={clearError} className="mb-6" />

      {/* Current Settings Summary */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Comisiones</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-600">Configuraciones Activas</p>
            <p className="text-2xl font-bold text-blue-900">
              {commissionSettings.filter(s => {
                const now = new Date();
                const from = new Date(s.effectiveFrom);
                const to = s.effectiveTo ? new Date(s.effectiveTo) : null;
                return now >= from && (!to || now <= to);
              }).length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-600">Tasa Promedio</p>
            <p className="text-2xl font-bold text-green-900">
              {commissionSettings.length > 0
                ? `${(commissionSettings.reduce((sum, s) => sum + s.rate, 0) / commissionSettings.length).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-yellow-600">Configuraciones Totales</p>
            <p className="text-2xl font-bold text-yellow-900">{commissionSettings.length}</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {editingSetting ? 'Editar Configuración' : 'Nueva Configuración'}
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#E30613] text-white px-4 py-2 rounded-lg hover:bg-[#C9050F] flex items-center"
          >
            {showForm ? 'Cancelar' : 'Agregar Configuración'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasa de Comisión (%)*
                </label>
                <input
                  type="number"
                  name="rate"
                  value={formData.rate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Rango recomendado: 5-10%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Mínimo (ARS)
                </label>
                <input
                  type="number"
                  name="minAmount"
                  value={formData.minAmount}
                  onChange={handleInputChange}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Máximo (ARS)
                </label>
                <input
                  type="number"
                  name="maxAmount"
                  value={formData.maxAmount}
                  onChange={handleInputChange}
                  min="0"
                  step="100"
                  placeholder="Sin límite"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vigente Desde*
                </label>
                <input
                  type="date"
                  name="effectiveFrom"
                  value={formData.effectiveFrom}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vigente Hasta
                </label>
                <input
                  type="date"
                  name="effectiveTo"
                  value={formData.effectiveTo}
                  onChange={handleInputChange}
                  placeholder="Sin fecha límite"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Descripción opcional de esta configuración..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 underline"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#E30613] text-white px-6 py-2 rounded-lg hover:bg-[#C9050F] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  editingSetting ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Commission Settings List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Configuraciones de Comisión ({commissionSettings.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" message="Cargando configuraciones..." />
          </div>
        ) : commissionSettings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚙️</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No hay configuraciones</h3>
            <p className="text-gray-600">
              Crea tu primera configuración de comisión usando el botón de arriba.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {commissionSettings.map((setting) => (
              <div key={setting.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Comisión {setting.rate}%
                      </h4>
                      {getStatusBadge(setting)}
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Mínimo:</span> {formatCurrency(setting.minAmount)}
                      </div>
                      <div>
                        <span className="font-medium">Máximo:</span> {formatCurrency(setting.maxAmount)}
                      </div>
                      <div>
                        <span className="font-medium">Desde:</span> {formatDate(setting.effectiveFrom)}
                      </div>
                      <div>
                        <span className="font-medium">Hasta:</span> {formatDate(setting.effectiveTo)}
                      </div>
                    </div>

                    {setting.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {setting.description}
                      </p>
                    )}
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => handleEdit(setting)}
                      className="text-[#E30613] hover:text-[#C9050F] underline text-sm"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-3">ℹ️ Información sobre Comisiones</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• <strong>Rango recomendado:</strong> Las comisiones deben estar entre 5% y 10%.</p>
          <p>• <strong>Vigencia:</strong> Las configuraciones tienen fechas de vigencia para planificar cambios.</p>
          <p>• <strong>Montos:</strong> Puedes configurar comisiones diferentes según el rango de monto del servicio.</p>
          <p>• <strong>Activas:</strong> Solo las configuraciones activas (dentro de su período de vigencia) se aplican.</p>
          <p>• <strong>Historial:</strong> Todas las configuraciones se mantienen para auditoría.</p>
        </div>
      </div>
    </div>
  );
};

export default CommissionSettingsForm;
