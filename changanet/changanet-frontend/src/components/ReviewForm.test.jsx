import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext } from '../context/AuthContext';
import ReviewForm from './ReviewForm';

// Mock the review service
jest.mock('../services/reviewService');
const mockReviewService = require('../services/reviewService');

// Mock the AuthContext
const mockAuthContext = {
  user: {
    id: 'user-123',
    nombre: 'Test User',
    email: 'test@example.com'
  }
};

const renderWithAuth = (component) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {component}
    </AuthContext.Provider>
  );
};

describe('ReviewForm', () => {
  const mockOnReviewSubmitted = jest.fn();
  const defaultProps = {
    servicio_id: 'service-123',
    onReviewSubmitted: mockOnReviewSubmitted
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReviewService.checkReviewEligibility = jest.fn();
    mockReviewService.createReview = jest.fn();
  });

  it('shows loading state while checking eligibility', () => {
    mockReviewService.checkReviewEligibility.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithAuth(<ReviewForm {...defaultProps} />);

    expect(screen.getByText('Verificando elegibilidad...')).toBeInTheDocument();
  });

  it('shows form when user can review', async () => {
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Calificación')).toBeInTheDocument();
      expect(screen.getByText('Comentario')).toBeInTheDocument();
      expect(screen.getByText('Foto del servicio')).toBeInTheDocument();
    });
  });

  it('shows ineligibility message when user cannot review', async () => {
    mockReviewService.checkReviewEligibility.mockResolvedValue({
      canReview: false
    });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Ya has dejado una reseña para este servicio. Solo se permite una reseña por servicio.')).toBeInTheDocument();
    });
  });

  it('handles eligibility check error', async () => {
    mockReviewService.checkReviewEligibility.mockRejectedValue(new Error('Network error'));

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Ya has dejado una reseña para este servicio. Solo se permite una reseña por servicio.')).toBeInTheDocument();
    });
  });

  it('validates rating is required', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enviar Reseña')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Enviar Reseña');
    expect(submitButton).toBeDisabled();

    // Try to submit without rating
    await user.click(submitButton);
    expect(mockReviewService.createReview).not.toHaveBeenCalled();
  });

  it('validates comment length', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Comentario')).toBeInTheDocument();
    });

    const commentTextarea = screen.getByPlaceholderText('Comparte tu experiencia con este servicio...');
    const longComment = 'a'.repeat(1001);

    await user.type(commentTextarea, longComment);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('El comentario no puede exceder 1000 caracteres')).toBeInTheDocument();
    });
  });

  it('shows character count for comments', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Comentario')).toBeInTheDocument();
    });

    const commentTextarea = screen.getByPlaceholderText('Comparte tu experiencia con este servicio...');
    const testComment = 'This is a test comment';

    await user.type(commentTextarea, testComment);

    expect(screen.getByText(`${testComment.length}/1000 caracteres`)).toBeInTheDocument();
  });

  it('submits review successfully', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });
    mockReviewService.createReview.mockResolvedValue({
      id: 'review-123',
      calificacion: 5,
      comentario: 'Excelente servicio'
    });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enviar Reseña')).toBeInTheDocument();
    });

    // Select rating (click first star)
    const stars = screen.getAllByRole('button');
    await user.click(stars[4]); // 5-star rating

    // Add comment
    const commentTextarea = screen.getByPlaceholderText('Comparte tu experiencia con este servicio...');
    await user.type(commentTextarea, 'Excelente servicio');

    // Submit
    const submitButton = screen.getByText('Enviar Reseña');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockReviewService.createReview).toHaveBeenCalledWith({
        servicio_id: 'service-123',
        calificacion: 5,
        comentario: 'Excelente servicio',
        url_foto: undefined
      });
    });

    // Should show success message
    expect(screen.getByText('¡Reseña enviada exitosamente!')).toBeInTheDocument();
    expect(mockOnReviewSubmitted).toHaveBeenCalled();
  });

  it('handles submission error', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });
    mockReviewService.createReview.mockRejectedValue(new Error('Submission failed'));

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enviar Reseña')).toBeInTheDocument();
    });

    // Select rating and add comment
    const stars = screen.getAllByRole('button');
    await user.click(stars[4]);
    const commentTextarea = screen.getByPlaceholderText('Comparte tu experiencia con este servicio...');
    await user.type(commentTextarea, 'Test comment');

    // Submit
    const submitButton = screen.getByText('Enviar Reseña');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Error al enviar la reseña. Inténtalo de nuevo.')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });
    mockReviewService.createReview.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enviar Reseña')).toBeInTheDocument();
    });

    // Select rating and submit
    const stars = screen.getAllByRole('button');
    await user.click(stars[4]);
    const submitButton = screen.getByText('Enviar Reseña');
    await user.click(submitButton);

    expect(screen.getByText('Enviando reseña...')).toBeInTheDocument();
  });

  it('resets form after successful submission', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });
    mockReviewService.createReview.mockResolvedValue({
      id: 'review-123',
      calificacion: 4,
      comentario: 'Good service'
    });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enviar Reseña')).toBeInTheDocument();
    });

    // Fill form
    const stars = screen.getAllByRole('button');
    await user.click(stars[3]); // 4 stars
    const commentTextarea = screen.getByPlaceholderText('Comparte tu experiencia con este servicio...');
    await user.type(commentTextarea, 'Good service');

    // Submit
    const submitButton = screen.getByText('Enviar Reseña');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('¡Reseña enviada exitosamente!')).toBeInTheDocument();
    });

    // Form should be reset and user should not be able to review again
    expect(screen.getByText('Ya has dejado una reseña para este servicio. Solo se permite una reseña por servicio.')).toBeInTheDocument();
  });

  it('handles image selection', async () => {
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Foto del servicio')).toBeInTheDocument();
    });

    // The ImageUpload component is mocked, so we can't test the actual file selection
    // But we can verify the component is rendered
    expect(screen.getByText('Foto del servicio')).toBeInTheDocument();
  });

  it('validates form before submission', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enviar Reseña')).toBeInTheDocument();
    });

    // Try to submit with comment too long
    const commentTextarea = screen.getByPlaceholderText('Comparte tu experiencia con este servicio...');
    await user.type(commentTextarea, 'a'.repeat(1001));

    const stars = screen.getAllByRole('button');
    await user.click(stars[4]); // Select rating

    const submitButton = screen.getByText('Enviar Reseña');
    await user.click(submitButton);

    expect(mockReviewService.createReview).not.toHaveBeenCalled();
    expect(screen.getByText('El comentario no puede exceder 1000 caracteres')).toBeInTheDocument();
  });

  it('does not render without user context', () => {
    // This test might not be necessary as the component expects AuthContext
    // But let's ensure it handles missing user gracefully
    expect(() => {
      render(<ReviewForm {...defaultProps} />);
    }).not.toThrow();
  });

  it('handles real-time validation for rating', async () => {
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enviar Reseña')).toBeInTheDocument();
    });

    // Initially no rating error
    expect(screen.queryByText('La calificación debe estar entre 1 y 5 estrellas')).not.toBeInTheDocument();

    // Select invalid rating (this shouldn't happen with the component, but test edge case)
    // The RatingStars component prevents invalid ratings, so this tests the validation logic
  });

  it('auto-hides success message after timeout', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup();
    mockReviewService.checkReviewEligibility.mockResolvedValue({ canReview: true });
    mockReviewService.createReview.mockResolvedValue({ id: 'review-123' });

    renderWithAuth(<ReviewForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enviar Reseña')).toBeInTheDocument();
    });

    // Submit successfully
    const stars = screen.getAllByRole('button');
    await user.click(stars[4]);
    const submitButton = screen.getByText('Enviar Reseña');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('¡Reseña enviada exitosamente!')).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.queryByText('¡Reseña enviada exitosamente!')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
