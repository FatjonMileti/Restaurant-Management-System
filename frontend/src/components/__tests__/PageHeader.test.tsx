import React from 'react';
import { render, screen } from '@testing-library/react';
import PageHeader from '../PageHeader';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders action button', () => {
    render(<PageHeader title="Menu" action={<button>Add Item</button>} />);
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('applies flex justify-between classes', () => {
    const { container } = render(<PageHeader title="Orders" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('flex');
    expect(outer.className).toContain('justify-between');
    expect(outer.className).toContain('items-center');
    expect(outer.className).toContain('mb-2');
  });

  it('merges custom className', () => {
    const { container } = render(<PageHeader title="X" className="mb-4" />);
    expect((container.firstChild as HTMLElement).className).toContain('mb-4');
  });

  it('renders with different heading variant', () => {
    render(<PageHeader title="Dashboard" headingVariant="h3" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
