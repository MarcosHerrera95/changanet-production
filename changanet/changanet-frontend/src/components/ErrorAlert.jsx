// src/components/ErrorAlert.jsx
const ErrorAlert = ({ message, onRetry }) => {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">¡Error! </strong>
      <span className="block sm:inline">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 transition"
        >
          Reintentar
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;
