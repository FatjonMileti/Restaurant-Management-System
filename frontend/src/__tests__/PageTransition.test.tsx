import { render, screen } from '@testing-library/react';
import { PageTransition } from '../App';

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      <PageTransition>
        <p>page content</p>
      </PageTransition>,
    );
    expect(screen.getByText('page content')).toBeInTheDocument();
  });
});
