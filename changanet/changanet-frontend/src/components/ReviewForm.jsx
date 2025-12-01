import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import reviewService from '../services/reviewService';
import RatingStars from './RatingStars';
import ImageUpload from './ImageUpload';

const ReviewForm = ({ servicio_id, onReviewSubmitted }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Verificar si el usuario puede dejar reseña al cargar el componente
  useEffect(() => {
    const checkReviewEligibility = async () => {
      if (!user || !servicio_id) return;

      try {
        const data = await reviewService.checkReviewEligibility(servicio_id);
        setCanReview(data.canReview);
      } catch (error) {
        console.error('Error verificando elegibilidad para reseña:', error);
        setCanReview(false);
      } finally {
        setCheckingReview(false);
      }
    };

    checkReviewEligibility();
  }, [user, servicio_id]);

  // Validaciones en tiempo real
  const validateForm = () => {
    const errors = {};

    if (rating < 1 || rating > 5) {
      errors.rating = 'La calificación debe estar entre 1 y 5 estrellas';
    }

    if (comment.length > 1000) {
      errors.comment = 'El comentario no puede exceder 1000 caracteres';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validación en tiempo real para rating
  useEffect(() => {
    if (rating > 0 && rating <= 5) {
      setValidationErrors(prev => ({ ...prev, rating: null }));
    } else if (rating !== 0) {
      setValidationErrors(prev => ({ ...prev, rating: 'La calificación debe estar entre 1 y 5 estrellas' }));
    }
  }, [rating]);

  // Validación en tiempo real para comentario
  useEffect(() => {
    if (comment.length <= 1000) {
      setValidationErrors(prev => ({ ...prev, comment: null }));
    } else {
      setValidationErrors(prev => ({ ...prev, comment: 'El comentario no puede exceder 1000 caracteres' }));
    }
  }, [comment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    // Validaciones frontend
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const reviewData = {
        servicio_id,
        calificacion: rating,
        comentario: comment.trim(),
        ...(photo && { url_foto: photo })
      };

      const review = await reviewService.createReview(reviewData);

      setSubmitSuccess(true);
      onReviewSubmitted?.(review);

      // Reset form
      setRating(0);
      setComment('');
      setPhoto(null);
      setCanReview(false); // Ya no puede reseñar más

      // Mostrar mensaje de éxito por 3 segundos
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error enviando reseña:', error);
      setError(error.message || 'Error al enviar la reseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };


  if (checkingReview) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mr-2"></div>
        <span className="text-gray-600">Verificando elegibilidad...</span>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-2xl">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          Ya has dejado una reseña para este servicio. Solo se permite una reseña por servicio.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensaje de éxito */}
      {submitSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center">
          <span className="text-2xl mr-3">✅</span>
          <div>
            <p className="font-medium">¡Reseña enviada exitosamente!</p>
            <p className="text-sm">Tu calificación ayudará a otros usuarios a elegir el mejor profesional.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error general */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center">
            <span className="text-xl mr-3">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Rating con RatingStars */}
        <RatingStars
          value={rating}
          onChange={setRating}
          required={true}
          error={validationErrors.rating}
        />

        {/* Comment */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Comentario <span className="text-gray-500 text-sm">(opcional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400 resize-none ${
              validationErrors.comment ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
            rows={4}
            placeholder="Comparte tu experiencia con este servicio..."
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-1">
            {validationErrors.comment && (
              <p className="text-sm text-red-600">{validationErrors.comment}</p>
            )}
            <p className="text-sm text-gray-500 ml-auto">
              {comment.length}/1000 caracteres
            </p>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Foto del servicio <span className="text-gray-500 text-sm">(opcional)</span>
          </label>
          <ImageUpload
            onImageSelect={(file) => setPhoto(file)}
            onImageRemove={() => setPhoto(null)}
            placeholder="Seleccionar foto del servicio reseñado"
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || rating === 0}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Enviando reseña...
            </>
          ) : (
            <>
              <span className="mr-2">⭐</span>
              Enviar Reseña
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;
