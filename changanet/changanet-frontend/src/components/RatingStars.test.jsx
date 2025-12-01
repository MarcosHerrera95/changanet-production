import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RatingStars from './RatingStars';

describe('RatingStars', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with default props', () => {
    render(<RatingStars onChange={mockOnChange} />);

    // Should render 5 stars
    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(5);

    // Should show label
    expect(screen.getByText('Calificación')).toBeInTheDocument();

    // Should show required indicator
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders with custom props', () => {
    render(
      <RatingStars
        value={3}
        onChange={mockOnChange}
        maxStars={7}
        size="lg"
        disabled={true}
        showLabel={false}
        required={false}
      />
    );

    // Should render 7 stars
    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(7);

    // Should not show label
    expect(screen.queryByText('Calificación')).not.toBeInTheDocument();

    // Should not show required indicator
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('displays correct rating value', () => {
    render(<RatingStars value={4} onChange={mockOnChange} />);

    // Should show 4 stars as active
    const stars = screen.getAllByRole('button');
    expect(stars[0]).toHaveAttribute('aria-label', expect.stringContaining('1 estrella'));
    expect(stars[3]).toHaveAttribute('aria-label', expect.stringContaining('4 estrella'));

    // Should show rating label
    expect(screen.getByText('4 estrellas - Excelente')).toBeInTheDocument();
  });

  it('shows correct labels for different ratings', () => {
    const ratings = [
      { value: 1, label: 'Muy malo' },
      { value: 2, label: 'Malo' },
      { value: 3, label: 'Regular' },
      { value: 4, label: 'Bueno' },
      { value: 5, label: 'Excelente' }
    ];

    ratings.forEach(({ value, label }) => {
      const { rerender } = render(<RatingStars value={value} onChange={mockOnChange} />);
      expect(screen.getByText(`${value} estrella${value !== 1 ? 's' : ''} - ${label}`)).toBeInTheDocument();
      rerender(<RatingStars value={0} onChange={mockOnChange} />);
    });
  });

  it('calls onChange when star is clicked', async () => {
    const user = userEvent.setup();
    render(<RatingStars onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[2]); // Click 3rd star (value = 3)

    expect(mockOnChange).toHaveBeenCalledWith(3);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('shows hover effect', async () => {
    const user = userEvent.setup();
    render(<RatingStars onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');

    // Hover over 4th star
    await user.hover(stars[3]);
    expect(screen.getByText('4 estrellas - Bueno')).toBeInTheDocument();

    // Move mouse away
    await user.unhover(stars[3]);
    expect(screen.queryByText('estrellas -')).not.toBeInTheDocument();
  });

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup();
    render(<RatingStars onChange={mockOnChange} disabled={true} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[2]);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('shows disabled styling when disabled', () => {
    render(<RatingStars onChange={mockOnChange} disabled={true} />);

    const stars = screen.getAllByRole('button');
    stars.forEach(star => {
      expect(star).toHaveClass('cursor-not-allowed', 'opacity-50');
    });
  });

  it('shows error message when provided', () => {
    const errorMessage = 'Rating is required';
    render(<RatingStars onChange={mockOnChange} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows required hint when no rating selected', () => {
    render(<RatingStars onChange={mockOnChange} required={true} />);

    expect(screen.getByText('Selecciona una calificación para continuar')).toBeInTheDocument();
  });

  it('hides required hint when rating is selected', () => {
    render(<RatingStars value={3} onChange={mockOnChange} required={true} />);

    expect(screen.queryByText('Selecciona una calificación para continuar')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const sizes = ['sm', 'md', 'lg', 'xl'];
    const sizeClasses = {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-10 h-10'
    };

    sizes.forEach(size => {
      const { rerender } = render(<RatingStars onChange={mockOnChange} size={size} />);
      const stars = screen.getAllByRole('button');
      expect(stars[0]).toHaveClass(sizeClasses[size]);
      rerender(<RatingStars onChange={mockOnChange} size="md" />);
    });
  });

  it('has correct accessibility attributes', () => {
    render(<RatingStars value={3} onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');
    stars.forEach((star, index) => {
      const starValue = index + 1;
      expect(star).toHaveAttribute('aria-label', expect.stringContaining(`${starValue} estrella`));
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<RatingStars onChange={mockOnChange} />);

    const firstStar = screen.getAllByRole('button')[0];

    // Focus first star
    firstStar.focus();
    expect(firstStar).toHaveFocus();

    // Press Enter to select
    await user.keyboard('{Enter}');
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it('renders correct number of stars based on maxStars', () => {
    render(<RatingStars onChange={mockOnChange} maxStars={3} />);

    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(3);
  });

  it('handles zero value correctly', () => {
    render(<RatingStars value={0} onChange={mockOnChange} />);

    // Should not show rating text when value is 0
    expect(screen.queryByText(/estrellas -/)).not.toBeInTheDocument();
  });

  it('handles decimal values by flooring', () => {
    render(<RatingStars value={3.7} onChange={mockOnChange} />);

    // Should display as 3 stars (floored)
    expect(screen.getByText('3 estrellas - Regular')).toBeInTheDocument();
  });

  it('maintains hover state during interaction', async () => {
    const user = userEvent.setup();
    render(<RatingStars value={2} onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');

    // Initially shows 2 stars
    expect(screen.getByText('2 estrellas - Malo')).toBeInTheDocument();

    // Hover over 5th star
    await user.hover(stars[4]);
    expect(screen.getByText('5 estrellas - Excelente')).toBeInTheDocument();

    // Click while hovering
    await user.click(stars[4]);
    expect(mockOnChange).toHaveBeenCalledWith(5);

    // After click, should show 5 stars
    expect(screen.getByText('5 estrellas - Excelente')).toBeInTheDocument();
  });
});
