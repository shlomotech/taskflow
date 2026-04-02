import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/ui/modal';

describe('Modal', () => {
  it('does not render content when closed', () => {
    render(
      <Modal open={false} onOpenChange={vi.fn()} title="Test Modal">
        <p>Modal body</p>
      </Modal>
    );
    expect(screen.queryByText('Modal body')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(
      <Modal open={true} onOpenChange={vi.fn()} title="Test Modal">
        <p>Modal body</p>
      </Modal>
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders the title when open', () => {
    render(
      <Modal open={true} onOpenChange={vi.fn()} title="My Title">
        <span>content</span>
      </Modal>
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when close button is clicked', async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open={true} onOpenChange={onOpenChange} title="Close test">
        <span>body</span>
      </Modal>
    );
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('matches snapshot when open', () => {
    const { container } = render(
      <Modal open={true} onOpenChange={vi.fn()} title="Snapshot Modal">
        <p>snapshot content</p>
      </Modal>
    );
    expect(container).toMatchSnapshot();
  });
});
