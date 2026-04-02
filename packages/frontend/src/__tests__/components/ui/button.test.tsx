import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders all variants without crashing', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>Label</Button>);
      expect(screen.getByRole('button', { name: 'Label' })).toBeInTheDocument();
      unmount();
    }
  });

  it('renders all sizes without crashing', () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const;
    for (const size of sizes) {
      const { unmount } = render(<Button size={size}>S</Button>);
      expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
      unmount();
    }
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>No click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders as child element when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/test">Link button</a>
      </Button>
    );
    expect(screen.getByRole('link', { name: 'Link button' })).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<Button>Snapshot</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
