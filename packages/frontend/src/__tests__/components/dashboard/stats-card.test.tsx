import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

describe('StatsCard', () => {
  it('renders the count', () => {
    render(<StatsCard label="Todo" count={5} status="todo" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<StatsCard label="In Progress" count={3} status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders count of 0', () => {
    render(<StatsCard label="Done" count={0} status="done" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders for each status variant', () => {
    const statuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const;
    for (const status of statuses) {
      const { unmount } = render(
        <StatsCard label={status} count={1} status={status} />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      unmount();
    }
  });

  it('matches snapshot', () => {
    const { container } = render(
      <StatsCard label="Backlog" count={12} status="backlog" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
