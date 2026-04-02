import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layout/sidebar';

// Mock next/navigation since Sidebar uses usePathname for active link detection
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import { usePathname } from 'next/navigation';

const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;

describe('Sidebar', () => {
  it('renders the Dashboard nav link', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('renders the Projects nav link', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
  });

  it('highlights the active Dashboard link when on /dashboard', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Sidebar />);
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the active Projects link when on /projects', () => {
    mockUsePathname.mockReturnValue('/projects');
    render(<Sidebar />);
    const projectsLink = screen.getByRole('link', { name: /projects/i });
    expect(projectsLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark Dashboard as active when on /projects', () => {
    mockUsePathname.mockReturnValue('/projects');
    render(<Sidebar />);
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('matches snapshot', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    const { container } = render(<Sidebar />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
