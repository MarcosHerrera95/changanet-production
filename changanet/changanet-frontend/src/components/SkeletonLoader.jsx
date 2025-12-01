/**
 * Componentes de skeleton loading reutilizables
 * Proporciona placeholders visuales mientras se cargan los datos
 */

import React from 'react';

// Skeleton base con animación de pulso
const SkeletonBase = ({ className = '', children }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}>
    {children}
  </div>
);

// Skeleton para tarjetas de profesional
export const ProfessionalCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-start space-x-4">
      <SkeletonBase className="w-16 h-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-4 w-3/4" />
        <SkeletonBase className="h-3 w-1/2" />
        <SkeletonBase className="h-3 w-1/4" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <SkeletonBase className="h-3 w-full" />
      <SkeletonBase className="h-3 w-2/3" />
    </div>
    <div className="mt-4 flex space-x-2">
      <SkeletonBase className="h-8 w-20" />
      <SkeletonBase className="h-8 w-20" />
    </div>
  </div>
);

// Skeleton para lista de profesionales
export const ProfessionalsListSkeleton = ({ count = 6 }) => (
  <div className="space-y-6">
    {Array.from({ length: count }, (_, i) => (
      <ProfessionalCardSkeleton key={i} />
    ))}
  </div>
);

// Skeleton para perfil de profesional
export const ProfessionalProfileSkeleton = () => (
  <div className="max-w-4xl mx-auto">
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-start space-x-6">
        <SkeletonBase className="w-24 h-24 rounded-full" />
        <div className="flex-1 space-y-3">
          <SkeletonBase className="h-6 w-1/3" />
          <SkeletonBase className="h-4 w-1/4" />
          <SkeletonBase className="h-4 w-1/2" />
          <div className="flex space-x-4 mt-4">
            <SkeletonBase className="h-6 w-16" />
            <SkeletonBase className="h-6 w-16" />
            <SkeletonBase className="h-6 w-16" />
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <SkeletonBase className="h-5 w-1/3 mb-4" />
        <div className="space-y-3">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-3/4" />
          <SkeletonBase className="h-4 w-1/2" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <SkeletonBase className="h-5 w-1/3 mb-4" />
        <div className="space-y-3">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  </div>
);

// Skeleton para tabla de cotizaciones
export const QuotesTableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2">
            <SkeletonBase className="h-5 w-32" />
            <SkeletonBase className="h-3 w-24" />
            <SkeletonBase className="h-3 w-20" />
          </div>
          <SkeletonBase className="h-6 w-20" />
        </div>
        <div className="space-y-2 mb-4">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-3/4" />
        </div>
        <div className="flex space-x-3">
          <SkeletonBase className="h-8 w-20" />
          <SkeletonBase className="h-8 w-20" />
        </div>
      </div>
    ))}
  </div>
);

// Skeleton para dashboard
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg shadow p-6">
      <SkeletonBase className="h-6 w-1/3 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonBase className="h-20" />
        <SkeletonBase className="h-20" />
        <SkeletonBase className="h-20" />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <SkeletonBase className="h-5 w-1/3 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex justify-between">
              <SkeletonBase className="h-4 w-1/3" />
              <SkeletonBase className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <SkeletonBase className="h-5 w-1/3 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonBase key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonBase;
