// src/pages/Notifications.jsx
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setNotifications(data);
        } else {
          setError(data.error || 'Error al cargar notificaciones');
        }
      } catch (error) {
        setError('Error de red. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? data : n)
        );
      }
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('changanet_token')}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setNotifications(prev =>
          prev.map(n => ({ ...n, está_leído: true }))
        );
      }
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Centro de Notificaciones</h1>
        <button
          onClick={markAllAsRead}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition"
        >
          Marcar todas como leídas
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-6 border-b ${!notification.está_leído ? 'bg-blue-50' : ''}`}
            >
              <div className="flex justify-between">
                <div>
                  <p className="text-lg font-medium">{notification.mensaje}</p>
                  <p className="text-gray-500 mt-1">
                    {new Date(notification.creado_en).toLocaleString()}
                  </p>
                </div>
                {!notification.está_leído && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-primary hover:underline"
                  >
                    Marcar como leída
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-gray-500">
            No tienes notificaciones
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
