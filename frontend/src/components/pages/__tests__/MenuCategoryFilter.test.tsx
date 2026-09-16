import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MenuCategoryFilter from '../MenuCategoryFilter';

describe('MenuCategoryFilter', () => {
  it('renders All plus categories as tabs', () => {
    render(<MenuCategoryFilter categories={['Food', 'Drinks']} value="" onChange={jest.fn()} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Drinks')).toBeInTheDocument();
  });

  it('marks the active category tab', () => {
    render(<MenuCategoryFilter categories={['Food']} value="Food" onChange={jest.fn()} />);
    expect(screen.getByText('Food')).toHaveClass('tab-btn-active');
    expect(screen.getByText('All')).toHaveClass('tab-btn-inactive');
  });

  it('calls onChange when a category tab is clicked', () => {
    const onChange = jest.fn();
    render(<MenuCategoryFilter categories={['Food', 'Drinks']} value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('Drinks'));
    expect(onChange).toHaveBeenCalledWith('Drinks');
  });

  it('calls onChange with empty when All is clicked', () => {
    const onChange = jest.fn();
    render(<MenuCategoryFilter categories={['Food']} value="Food" onChange={onChange} />);
    fireEvent.click(screen.getByText('All'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
