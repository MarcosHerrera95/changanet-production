import React from 'react';
import PropTypes from 'prop-types';

/**
 * FormField - Componente para campos de formulario con validación
 *
 * @param {string} label - Etiqueta del campo
 * @param {string} type - Tipo de input
 * @param {string} value - Valor del campo
 * @param {Function} onChange - Función para cambiar el valor
 * @param {string} error - Mensaje de error
 * @param {string} placeholder - Placeholder del campo
 * @param {boolean} required - Si el campo es requerido
 * @param {Object} props - Props adicionales para el input
 */
const FormField = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  className = '',
  ...props
}) => {
  const inputClasses = `
    w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent
    ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
    ${className}
  `;

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`${inputClasses} resize-none`}
          rows={4}
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={inputClasses}
          {...props}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
};

FormField.propTypes = {
  label: PropTypes.string,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
};

export default FormField;
