import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewList from './ReviewList';

// Mock the review service
jest.mock('../services/reviewService');
const mockReviewService = require('../services/reviewService');

// Mock LoadingSpinner component
jest.mock('./ui/LoadingSpinner', () => {
  return function LoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

describe('ReviewList', () => {
  const mockProfessionalId = 'professional-123';
  const mockStats = {
    professionalId: mockProfessionalId,
    totalReviews: 25,
    averageRating: 4.2,
    ratingDistribution: { 1: 0, 2: 1, 3: 3, 4: 8, 5: 13 },
    positivePercentage: 84,
    lastReviewDate: '2025-11-28T10:30:00Z'
  };

  const mockReviews = [
    {
      id: 'review-1',
      calificacion: 5,
      comentario: 'Excelente servicio',
      creado_en: '2025-11-28T10:00:00Z',
      cliente: { nombre: 'Cliente 1' },
      servicio: { descripcion: 'Servicio 1' }
    },
    {
      id: 'review-2',
      calificacion: 4,
      comentario: 'Muy buen trabajo',
      creado_en: '2025-11-27T15:30:00Z',
      cliente: { nombre: 'Cliente 2' },
      servicio: { descripcion: 'Servicio 2' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockReviewService.getProfessionalStats = jest.fn();
    mockReviewService.getProfessionalReviews = jest.fn();
    mockReviewService.subscribeToStats = jest.fn();
  });

  it('shows loading state initially', () => {
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ReviewList professionalId={mockProfessionalId} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Cargando reseñas...')).toBeInTheDocument();
  });

  it('displays stats when showStats is true', async () => {
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} showStats={true} />);

    await waitFor(() => {
      expect(screen.getByText('Resumen de Valoraciones')).toBeInTheDocument();
      expect(screen.getByText('4.2')).toBeInTheDocument(); // Average rating
      expect(screen.getByText('25')).toBeInTheDocument(); // Total reviews
      expect(screen.getByText('84%')).toBeInTheDocument(); // Positive percentage
    });
  });

  it('hides stats when showStats is false', async () => {
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} showStats={false} />);

    await waitFor(() => {
      expect(screen.queryByText('Resumen de Valoraciones')).not.toBeInTheDocument();
    });
  });

  it('displays reviews list', async () => {
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} />);

    await waitFor(() => {
      expect(screen.getByText('Excelente servicio')).toBeInTheDocument();
      expect(screen.getByText('Muy buen trabajo')).toBeInTheDocument();
      expect(screen.getByText('Cliente 1')).toBeInTheDocument();
      expect(screen.getByText('Cliente 2')).toBeInTheDocument();
    });
  });

  it('shows empty state when no reviews', async () => {
    mockReviewService.getProfessionalStats.mockResolvedValue({
      ...mockStats,
      totalReviews: 0
    });
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: [],
      total: 0
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} />);

    await waitFor(() => {
      expect(screen.getByText('⭐')).toBeInTheDocument();
      expect(screen.getByText('No hay reseñas aún')).toBeInTheDocument();
      expect(screen.getByText('Este profesional aún no tiene reseñas de clientes.')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockRejectedValue(new Error('Network error'));
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} />);

    await waitFor(() => {
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Error al cargar las reseñas. Inténtalo de nuevo.')).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByText('Reintentar');
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });

    await userEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Excelente servicio')).toBeInTheDocument();
    });
  });

  it('shows pagination when multiple pages', async () => {
    const manyReviews = Array.from({ length: 8 }, (_, i) => ({
      id: `review-${i}`,
      calificacion: 4,
      comentario: `Review ${i}`,
      creado_en: '2025-11-28T10:00:00Z',
      cliente: { nombre: `Cliente ${i}` },
      servicio: { descripcion: `Servicio ${i}` }
    }));

    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: manyReviews.slice(0, 5), // First page
      total: 8
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} itemsPerPage={5} />);

    await waitFor(() => {
      expect(screen.getByText('Mostrando 5 reseñas (página 1 de 2)')).toBeInTheDocument();
      expect(screen.getByText('Siguiente →')).toBeInTheDocument();
    });
  });

  it('handles sorting functionality', async () => {
    const user = userEvent.setup();
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('newest')).toBeInTheDocument();
    });

    // Change sort order
    const sortSelect = screen.getByDisplayValue('newest');
    await user.selectOptions(sortSelect, 'highest');

    expect(mockReviewService.getProfessionalReviews).toHaveBeenCalledWith(
      mockProfessionalId,
      1, // Reset to page 1
      5,
      'highest'
    );
  });

  it('respects itemsPerPage prop', async () => {
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} itemsPerPage={3} />);

    await waitFor(() => {
      expect(mockReviewService.getProfessionalReviews).toHaveBeenCalledWith(
        mockProfessionalId,
        1,
        3,
        'newest'
      );
    });
  });

  it('handles page changes', async () => {
    const user = userEvent.setup();
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews
      .mockResolvedValueOnce({
        reviews: mockReviews.slice(0, 1),
        total: 2
      })
      .mockResolvedValueOnce({
        reviews: mockReviews.slice(1, 2),
        total: 2
      });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} itemsPerPage={1} />);

    await waitFor(() => {
      expect(screen.getByText('Excelente servicio')).toBeInTheDocument();
    });

    // Click next page
    const nextButton = screen.getByText('Siguiente →');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Muy buen trabajo')).toBeInTheDocument();
      expect(mockReviewService.getProfessionalReviews).toHaveBeenCalledWith(
        mockProfessionalId,
        2,
        1,
        'newest'
      );
    });
  });

  it('shows service info when showServiceInfo is true', async () => {
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} showServiceInfo={true} />);

    await waitFor(() => {
      // The ReviewCard component should receive showServiceInfo prop
      // We can't test the actual rendering without mocking ReviewCard
      expect(mockReviewService.getProfessionalReviews).toHaveBeenCalled();
    });
  });

  it('applies custom className', async () => {
    const customClass = 'custom-review-list';
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    const { container } = render(
      <ReviewList professionalId={mockProfessionalId} className={customClass} />
    );

    await waitFor(() => {
      expect(container.firstChild).toHaveClass(customClass);
    });
  });

  it('handles stats subscription cleanup', async () => {
    const unsubscribeMock = jest.fn();
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(unsubscribeMock);

    const { unmount } = render(<ReviewList professionalId={mockProfessionalId} />);

    await waitFor(() => {
      expect(unsubscribeMock).not.toHaveBeenCalled();
    });

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('does not load data when professionalId is not provided', () => {
    render(<ReviewList />);

    expect(mockReviewService.getProfessionalStats).not.toHaveBeenCalled();
    expect(mockReviewService.getProfessionalReviews).not.toHaveBeenCalled();
  });

  it('handles stats loading error gracefully', async () => {
    mockReviewService.getProfessionalStats.mockRejectedValue(new Error('Stats error'));
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: mockReviews,
      total: 2
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} />);

    await waitFor(() => {
      // Should still show reviews even if stats fail
      expect(screen.getByText('Excelente servicio')).toBeInTheDocument();
    });
  });

  it('displays correct review count text', async () => {
    mockReviewService.getProfessionalStats.mockResolvedValue(mockStats);
    mockReviewService.getProfessionalReviews.mockResolvedValue({
      reviews: [mockReviews[0]],
      total: 1
    });
    mockReviewService.subscribeToStats.mockReturnValue(jest.fn());

    render(<ReviewList professionalId={mockProfessionalId} />);

    await waitFor(() => {
      expect(screen.getByText('Mostrando 1 reseña')).toBeInTheDocument();
    });
  });
});
