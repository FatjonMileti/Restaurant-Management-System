import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RestaurantDetails from '../RestaurantDetails';
import * as queries from '../../api/queries';
import * as imageCache from '../../hooks/useCachedImage';

const mockUseRestaurantSettings = jest.spyOn(queries, 'useRestaurantSettings');

const settings = {
  _id: 's1',
  name: 'Bistro',
  logo: '/images/logo.png',
  address: '',
  phone: '',
  email: '',
  tableCount: 10,
  updatedAt: '2024-01-01T10:00:00.000Z',
};

const renderDetails = () =>
  render(
    <MemoryRouter>
      <RestaurantDetails />
    </MemoryRouter>,
  );

describe('RestaurantDetails', () => {
  beforeEach(() => {
    mockUseRestaurantSettings.mockReturnValue({ data: settings } as any);
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    localStorage.clear();
  });
  afterEach(() => jest.clearAllMocks());

  it('links the logo / restaurant name to the menu page', () => {
    renderDetails();
    expect(screen.getByText('Bistro').closest('a')).toHaveAttribute('href', '/menu');
  });

  it('clears the image cache when the brand is clicked', () => {
    const clearSpy = jest.spyOn(imageCache, 'clearImageCache');
    localStorage.setItem(
      'rms-img:/images/logo.png::2024-01-01T10:00:00.000Z',
      'data:image/png;base64,x',
    );
    renderDetails();
    fireEvent.click(screen.getByText('Bistro'));
    expect(clearSpy).toHaveBeenCalled();
    expect(localStorage.getItem('rms-img:/images/logo.png::2024-01-01T10:00:00.000Z')).toBeNull();
  });

  it('falls back to the default name when settings are missing', () => {
    mockUseRestaurantSettings.mockReturnValue({ data: null } as any);
    renderDetails();
    expect(screen.getByText('Restaurant MS')).toBeInTheDocument();
  });
});
