import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>In Progress</Badge>);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders all variants without crashing', () => {
    const variants = ['default', 'secondary', 'destructive', 'outline'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>Label</Badge>);
      expect(screen.getByText('Label')).toBeInTheDocument();
      unmount();
    }
  });

  it('accepts additional className', () => {
    const { container } = render(<Badge className="custom-class">Badge</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('matches snapshot', () => {
    const { container } = render(<Badge variant="secondary">Done</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
