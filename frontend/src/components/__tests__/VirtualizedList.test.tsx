import React from 'react';
import { render, screen } from '@testing-library/react';
import VirtualizedList from '../VirtualizedList';

jest.mock('@tanstack/react-virtual', () => {
  return {
    // Simulate a 10-row visible window over the full list: the component must
    // mount only the window (plus loader row), proving useVirtualizer drives rendering.
    useVirtualizer: ({ count }: any) => {
      const end = Math.min(10, count);
      const items = Array.from({ length: end }, (_, i) => ({ index: i, start: i * 50 }));
      return {
        getVirtualItems: () => items,
        getTotalSize: () => count * 50,
      };
    },
  };
});

describe('VirtualizedList', () => {
  it('renders all items for short lists without windowing', () => {
    render(
      <VirtualizedList
        items={[{ _id: 'a' }, { _id: 'b' }]}
        keyOf={(item: any) => item._id}
        renderItem={(item: any) => <span>{item._id}</span>}
      />,
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('shows empty message when there are no items', () => {
    render(
      <VirtualizedList
        items={[]}
        keyOf={(_: any, i: number) => i}
        renderItem={() => <span>x</span>}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('windows long lists via the virtualizer', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ _id: `id-${i}` }));
    const { container } = render(
      <VirtualizedList
        items={items}
        estimateSize={50}
        keyOf={(item: any) => item._id}
        renderItem={(item: any) => <span>{item._id}</span>}
      />,
    );
    const rendered = container.textContent ?? '';
    // Only the visible window is mounted — not all 100 rows.
    expect(rendered).toContain('id-0');
    expect(rendered).toContain('id-9');
    expect(rendered).not.toContain('id-99');
  });
});
