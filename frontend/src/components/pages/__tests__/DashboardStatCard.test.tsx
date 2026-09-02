import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardStatCard from '../DashboardStatCard';

describe('DashboardStatCard', () => {
  it('renders title and value', () => {
    render(<DashboardStatCard title="Total Orders" value={42} />);
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<DashboardStatCard title="Revenue" value="$100" subtitle="Completed orders" />);
    expect(screen.getByText('Completed orders')).toBeInTheDocument();
  });

  it('applies custom color', () => {
    const { container } = render(<DashboardStatCard title="Test" value={1} color="#ff0000" />);
    const paper = container.firstChild as HTMLElement;
    expect(paper.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('renders string value', () => {
    render(<DashboardStatCard title="Tables" value="5/10" />);
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });
});
