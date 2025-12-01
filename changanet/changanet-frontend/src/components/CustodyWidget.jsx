// src/components/CustodyWidget.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CustodyWidget = ({ serviceId }) => {
  const { user } = useAuth();
  const [custodyStatus, setCustodyStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCustodyStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/custody/service/${serviceId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustodyStatus(data);
      }
    } catch (error) {
      console.error('Error fetching custody status:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCustody = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/custody', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        },
        body: JSON.stringify({ servicio_id: serviceId, monto: 100.00 })
      });
      if (response.ok) {
        const data = await response.json();
        setCustodyStatus(data);
      }
    } catch (error) {
      console.error('Error creating custody:', error);
    } finally {
      setLoading(false);
    }
  };

  const releaseCustody = async () => {
    if (!custodyStatus) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/custody/${custodyStatus.id}/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('changanet_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustodyStatus(data);
      }
    } catch (error) {
      console.error('Error releasing custody:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Custodia de Fondos</h3>

      {!custodyStatus && (
        <button
          onClick={createCustody}
          disabled={loading}
          className="w-full bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 transition-all duration-300 font-semibold"
        >
          {loading ? 'Procesando...' : 'Retener Fondos'}
        </button>
      )}

      {custodyStatus && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Estado:</span>
            <span className={`font-semibold ${custodyStatus.estado === 'retenido' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {custodyStatus.estado === 'retenido' ? 'Fondos Retenidos' : 'Fondos Liberados'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Monto:</span>
            <span className="font-bold text-lg">${custodyStatus.monto}</span>
          </div>

          {custodyStatus.estado === 'retenido' && (
            <button
              onClick={releaseCustody}
              disabled={loading}
              className="w-full bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 transition-all duration-300 font-semibold"
            >
              {loading ? 'Liberando...' : 'Liberar Fondos'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CustodyWidget;
