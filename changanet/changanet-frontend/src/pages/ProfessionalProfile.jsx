import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import ProfessionalProfileForm from '../components/ProfessionalProfileForm';
import { useProfile } from '../hooks/useProfile';

const ProfessionalProfile = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSuccess = (message) => {
    setSuccessMessage(message);
    setErrorMessage('');
  };

  const handleError = (message) => {
    setErrorMessage(message);
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Mi Perfil Profesional</h1>
            <p className="text-gray-600">Completa tu perfil para comenzar a recibir trabajos</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Mensajes de estado */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl mb-6">
                {successMessage}
              </div>
            )}

            {/* Badge de verificación */}
            {user && user.esta_verificado && (
              <div className="mb-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-800">Identidad Verificada</h3>
                    <p className="text-emerald-700 text-sm">Tu identidad ha sido verificada exitosamente</p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario principal */}
            <ProfessionalProfileForm
              initialData={profile && typeof profile === 'object' ? {
                ...profile?.perfil,
                ...profile?.usuario,
                especialidades: Array.isArray(profile?.perfil?.especialidades)
                  ? profile.perfil.especialidades
                  : (profile?.perfil?.especialidades ? JSON.parse(profile.perfil.especialidades) : []),
              } : {
                especialidades: [],
                anos_experiencia: '',
                zona_cobertura: '',
                latitud: null,
                longitud: null,
                tipo_tarifa: 'hora',
                tarifa_hora: '',
                tarifa_servicio: '',
                tarifa_convenio: '',
                descripcion: '',
                url_foto_perfil: '',
                url_foto_portada: '',
                esta_disponible: true
              }}
              onSuccess={handleSuccess}
              onError={handleError}
            />

            {/* Información adicional */}
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 Consejos para un mejor perfil</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Completa todos los campos para aumentar tu visibilidad</li>
                <li>• Usa fotos profesionales que muestren tu trabajo</li>
                <li>• Sé específico sobre tus especialidades y experiencia</li>
                <li>• Define claramente tus tarifas y condiciones</li>
                <li>• Una buena descripción aumenta la confianza de los clientes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalProfile;
