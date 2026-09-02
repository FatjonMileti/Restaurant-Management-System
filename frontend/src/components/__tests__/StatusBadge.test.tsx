import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders status text', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('applies pending color', () => {
    const { container } = render(<StatusBadge status="pending" />);
    expect(container.firstChild).toHaveClass('bg-amber-500');
  });

  it('applies preparing color', () => {
    const { container } = render(<StatusBadge status="preparing" />);
    expect(container.firstChild).toHaveClass('bg-blue-500');
  });

  it('applies completed/confirmed green', () => {
    const { container } = render(<StatusBadge status="completed" />);
    expect(container.firstChild).toHaveClass('bg-green-600');
  });

  it('applies cancelled red', () => {
    const { container } = render(<StatusBadge status="cancelled" />);
    expect(container.firstChild).toHaveClass('bg-red-500');
  });

  it('applies custom className', () => {
    const { container } = render(<StatusBadge status="pending" className="text-xs" />);
    expect(container.firstChild).toHaveClass('text-xs');
  });

  it('capitalizes text via class', () => {
    const { container } = render(<StatusBadge status="pending" />);
    expect(container.firstChild).toHaveClass('capitalize');
  });
});
