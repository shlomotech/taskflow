import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from '@/components/ui/drawer';

describe('Drawer', () => {
  it('does not render content when closed', () => {
    render(
      <Drawer open={false} onOpenChange={vi.fn()} title="Drawer">
        <p>Drawer content</p>
      </Drawer>
    );
    expect(screen.queryByText('Drawer content')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(
      <Drawer open={true} onOpenChange={vi.fn()} title="Drawer">
        <p>Drawer content</p>
      </Drawer>
    );
    expect(screen.getByText('Drawer content')).toBeInTheDocument();
  });

  it('renders the title when open', () => {
    render(
      <Drawer open={true} onOpenChange={vi.fn()} title="Task Detail">
        <span>body</span>
      </Drawer>
    );
    expect(screen.getByText('Task Detail')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when close button is clicked', async () => {
    const onOpenChange = vi.fn();
    render(
      <Drawer open={true} onOpenChange={onOpenChange} title="Close">
        <span>body</span>
      </Drawer>
    );
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('matches snapshot when open', () => {
    const { container } = render(
      <Drawer open={true} onOpenChange={vi.fn()} title="Snapshot Drawer">
        <p>drawer snapshot content</p>
      </Drawer>
    );
    expect(container).toMatchSnapshot();
  });
});
