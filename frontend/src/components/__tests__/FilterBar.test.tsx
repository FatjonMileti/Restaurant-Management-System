import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from '../FilterBar';

jest.mock('../TableSelect', () => (props: any) => (
  <select
    data-testid="table-select"
    value={props.value}
    onChange={(e) => props.onChange(e.target.value)}
  >
    <option value="">Select table</option>
    <option value="1">Table 1</option>
  </select>
));

describe('FilterBar', () => {
  const options = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
  ];

  it('renders label and options', () => {
    render(<FilterBar label="Filter orders:" options={options} value="" onChange={jest.fn()} />);
    expect(screen.getByText('Filter orders:')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('calls onChange when select changes', () => {
    const onChange = jest.fn();
    render(<FilterBar label="Filter" options={options} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pending' } });
    expect(onChange).toHaveBeenCalledWith('pending');
  });

  it('shows Clear button when value present', () => {
    render(<FilterBar label="Filter" options={options} value="pending" onChange={jest.fn()} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('shows Clear button when inputValue present', () => {
    render(
      <FilterBar
        label="Filter"
        options={options}
        value=""
        onChange={jest.fn()}
        inputPlaceholder="Table #"
        inputValue="2"
        onInputChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('clears both filters on Clear click', () => {
    const onChange = jest.fn();
    const onInputChange = jest.fn();
    render(
      <FilterBar
        label="Filter"
        options={options}
        value="pending"
        onChange={onChange}
        inputValue="2"
        onInputChange={onInputChange}
        inputPlaceholder="Table #"
      />,
    );
    fireEvent.click(screen.getByText('Clear'));
    expect(onChange).toHaveBeenCalledWith('');
    expect(onInputChange).toHaveBeenCalledWith('');
  });

  it('renders TableSelect when useTableSelect', () => {
    render(
      <FilterBar
        label="Filter"
        options={options}
        value=""
        onChange={jest.fn()}
        inputPlaceholder="Table #"
        inputValue=""
        useTableSelect
      />,
    );
    expect(screen.getByTestId('table-select')).toBeInTheDocument();
  });

  it('applies theme classes', () => {
    const { container } = render(
      <FilterBar label="Filter" options={options} value="" onChange={jest.fn()} theme="blue" />,
    );
    expect(container.firstChild).toHaveClass('filter-bar-blue');
  });

  it('does not render user select when userOptions not provided', () => {
    render(<FilterBar label="Filter" options={options} value="" onChange={jest.fn()} />);
    expect(screen.queryByLabelText('Filter by user')).not.toBeInTheDocument();
  });

  it('renders user select with options when userOptions provided', () => {
    render(
      <FilterBar
        label="Filter"
        options={options}
        value=""
        onChange={jest.fn()}
        userOptions={[
          { value: 'u1', label: 'John' },
          { value: 'u2', label: 'Jane' },
        ]}
        userValue=""
        onUserChange={jest.fn()}
      />,
    );
    const select = screen.getByLabelText('Filter by user');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All users' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'John' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Jane' })).toBeInTheDocument();
  });

  it('calls onUserChange when user select changes', () => {
    const onUserChange = jest.fn();
    render(
      <FilterBar
        label="Filter"
        options={options}
        value=""
        onChange={jest.fn()}
        userOptions={[{ value: 'u1', label: 'John' }]}
        userValue=""
        onUserChange={onUserChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'u1' } });
    expect(onUserChange).toHaveBeenCalledWith('u1');
  });

  it('shows Clear when only userValue present and clears all filters', () => {
    const onChange = jest.fn();
    const onUserChange = jest.fn();
    render(
      <FilterBar
        label="Filter"
        options={options}
        value=""
        onChange={onChange}
        userOptions={[{ value: 'u1', label: 'John' }]}
        userValue="u1"
        onUserChange={onUserChange}
      />,
    );
    fireEvent.click(screen.getByText('Clear'));
    expect(onChange).toHaveBeenCalledWith('');
    expect(onUserChange).toHaveBeenCalledWith('');
  });
});
