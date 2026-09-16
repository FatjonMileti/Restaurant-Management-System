import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tabs from '../Tabs';
import Tab from '../Tab';

describe('Tab', () => {
  it('applies the active class when active', () => {
    render(
      <Tab active onClick={jest.fn()}>
        Active
      </Tab>,
    );
    expect(screen.getByText('Active')).toHaveClass('tab-btn-active');
  });

  it('applies the inactive class by default and calls onClick', () => {
    const onClick = jest.fn();
    render(<Tab onClick={onClick}>Idle</Tab>);
    const btn = screen.getByText('Idle');
    expect(btn).toHaveClass('tab-btn-inactive');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Tabs', () => {
  const tabs = [
    { key: 'a', label: 'Alpha' },
    { key: 'b', label: 'Beta' },
  ];

  it('renders all tabs with the active one highlighted', () => {
    render(<Tabs tabs={tabs} active="b" onChange={jest.fn()} />);
    expect(screen.getByText('Beta')).toHaveClass('tab-btn-active');
    expect(screen.getByText('Alpha')).toHaveClass('tab-btn-inactive');
  });

  it('calls onChange with the clicked tab key', () => {
    const onChange = jest.fn();
    render(<Tabs tabs={tabs} active="a" onChange={onChange} />);
    fireEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
