import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MenuCategoryFilter from '../MenuCategoryFilter';

describe('MenuCategoryFilter', () => {
  it('renders categories', () => {
    render(<MenuCategoryFilter categories={['Food', 'Drinks']} value="" onChange={jest.fn()} />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Drinks')).toBeInTheDocument();
  });

  it('shows Clear when value present', () => {
    render(<MenuCategoryFilter categories={['Food']} value="Food" onChange={jest.fn()} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('does not show Clear when empty', () => {
    render(<MenuCategoryFilter categories={['Food']} value="" onChange={jest.fn()} />);
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('calls onChange on select', () => {
    const onChange = jest.fn();
    render(<MenuCategoryFilter categories={['Food', 'Drinks']} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Drinks' } });
    expect(onChange).toHaveBeenCalledWith('Drinks');
  });

  it('calls onChange empty on Clear', () => {
    const onChange = jest.fn();
    render(<MenuCategoryFilter categories={['Food']} value="Food" onChange={onChange} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
