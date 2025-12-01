import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import BackToAccountButton from '../components/ui/BackToAccountButton';

const Availability = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackToAccountButton />

      <h1 className="text-3xl font-bold mb-6">Gestión de Disponibilidad</h1>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <p className="text-gray-600 mb-6">
          Gestiona tus horarios de disponibilidad para que los clientes puedan agendar servicios contigo.
        </p>

        <AvailabilityCalendar professionalId={user.id} />
      </div>
    </div>
  );
};

export default Availability;
