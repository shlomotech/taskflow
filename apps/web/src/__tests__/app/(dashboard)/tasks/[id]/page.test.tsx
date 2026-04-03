import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import TaskDetailPage from '@/app/(dashboard)/tasks/[id]/page';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockTask = {
  id: '1',
  title: 'Fix login bug',
  description: 'The login form crashes on invalid input.',
  status: 'in_progress',
  priority: 'high',
  assignee: { id: 'u1', name: 'Alice' },
};

const mockComments = [
  {
    id: 'c1',
    body: 'First comment here',
    author: { name: 'Bob' },
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    body: 'Second comment here',
    author: { name: 'Carol' },
    createdAt: '2024-01-02T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
const mockUseParams = useParams as ReturnType<typeof vi.fn>;
const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderPage() {
  return render(<TaskDetailPage />, { wrapper: createWrapper() });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRouter.mockReturnValue({ push: mockPush });
  mockUseParams.mockReturnValue({ id: '1' });
  mockApiFetch.mockImplementation((path: string) => {
    if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
    if (path === '/tasks/1') return Promise.resolve(mockTask);
    return Promise.resolve({});
  });
});

// ---------------------------------------------------------------------------
// Render — basic fields
// ---------------------------------------------------------------------------

describe('TaskDetailPage — render', () => {
  it('renders the task title', async () => {
    renderPage();
    expect(await screen.findByText('Fix login bug')).toBeInTheDocument();
  });

  it('renders the task description', async () => {
    renderPage();
    expect(
      await screen.findByText('The login form crashes on invalid input.'),
    ).toBeInTheDocument();
  });

  it('renders the task status', async () => {
    renderPage();
    expect(await screen.findByText(/in_progress|in progress/i)).toBeInTheDocument();
  });

  it('renders the task priority', async () => {
    renderPage();
    expect(await screen.findByText(/high/i)).toBeInTheDocument();
  });

  it('renders the assignee name', async () => {
    renderPage();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
  });

  it('fetches task data for the id from params', async () => {
    renderPage();
    await screen.findByText('Fix login bug');
    expect(mockApiFetch).toHaveBeenCalledWith('/tasks/1');
  });
});

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

describe('TaskDetailPage — loading state', () => {
  it('shows a loading skeleton before data arrives', () => {
    // Never resolve so we stay in loading state
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    // The component should render skeleton placeholders — look for aria or
    // a data-testid, or at minimum confirm the task title is absent.
    expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
  });

  it('removes the skeleton once data has loaded', async () => {
    renderPage();
    // Data resolves → title appears and loading indicator is gone
    await screen.findByText('Fix login bug');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('TaskDetailPage — error state', () => {
  it('shows an error message when the task fetch fails', async () => {
    mockApiFetch.mockRejectedValue({ message: 'Not found', status: 404 });
    renderPage();
    expect(
      await screen.findByText(/not found|failed to load|error/i),
    ).toBeInTheDocument();
  });

  it('does not render task fields when the fetch errors', async () => {
    mockApiFetch.mockRejectedValue({ message: 'Server error', status: 500 });
    renderPage();
    await waitFor(() =>
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument(),
    );
  });
});

// ---------------------------------------------------------------------------
// Editing fields
// ---------------------------------------------------------------------------

describe('TaskDetailPage — field editing', () => {
  it('allows editing the title and submits PATCH /tasks/1', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH' && path === '/tasks/1') {
        return Promise.resolve({ ...mockTask, title: 'Updated title' });
      }
      if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });

    renderPage();
    await screen.findByText('Fix login bug');

    // Activate inline edit for title (click title or an edit button)
    const titleEl = screen.getByText('Fix login bug');
    await user.click(titleEl);

    const input = await screen.findByDisplayValue('Fix login bug');
    await user.clear(input);
    await user.type(input, 'Updated title');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tasks/1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('Updated title'),
        }),
      ),
    );
  });

  it('allows editing the description and submits PATCH /tasks/1', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return Promise.resolve(mockTask);
      if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });

    renderPage();
    await screen.findByText('The login form crashes on invalid input.');

    const descEl = screen.getByText('The login form crashes on invalid input.');
    await user.click(descEl);

    const textarea = await screen.findByDisplayValue(
      'The login form crashes on invalid input.',
    );
    await user.clear(textarea);
    await user.type(textarea, 'Updated description');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tasks/1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('Updated description'),
        }),
      ),
    );
  });

  it('allows changing the status and submits PATCH /tasks/1', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return Promise.resolve({ ...mockTask, status: 'done' });
      if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });

    renderPage();
    await screen.findByText(/in_progress|in progress/i);

    const statusEl = screen.getByText(/in_progress|in progress/i);
    await user.click(statusEl);

    const doneOption = await screen.findByRole('option', { name: /done/i });
    await user.click(doneOption);

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tasks/1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('done'),
        }),
      ),
    );
  });

  it('allows changing the priority and submits PATCH /tasks/1', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return Promise.resolve({ ...mockTask, priority: 'low' });
      if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });

    renderPage();
    await screen.findByText(/high/i);

    const priorityEl = screen.getByText(/high/i);
    await user.click(priorityEl);

    const lowOption = await screen.findByRole('option', { name: /low/i });
    await user.click(lowOption);

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tasks/1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('low'),
        }),
      ),
    );
  });

  it('does not submit PATCH when edit is cancelled', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Fix login bug');

    const titleEl = screen.getByText('Fix login bug');
    await user.click(titleEl);

    const input = await screen.findByDisplayValue('Fix login bug');
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(mockApiFetch).not.toHaveBeenCalledWith(
        '/tasks/1',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Comments — listing
// ---------------------------------------------------------------------------

describe('TaskDetailPage — comments listing', () => {
  it('renders all comments', async () => {
    renderPage();
    expect(await screen.findByText('First comment here')).toBeInTheDocument();
    expect(await screen.findByText('Second comment here')).toBeInTheDocument();
  });

  it('shows the author name for each comment', async () => {
    renderPage();
    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(await screen.findByText('Carol')).toBeInTheDocument();
  });

  it('fetches comments for the task id', async () => {
    renderPage();
    await screen.findByText('First comment here');
    expect(mockApiFetch).toHaveBeenCalledWith('/tasks/1/comments');
  });

  it('shows empty state when there are no comments', async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path === '/tasks/1/comments') return Promise.resolve([]);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });
    renderPage();
    await screen.findByText('Fix login bug');
    expect(await screen.findByText(/no comments|be the first/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Comments — submitting a new comment
// ---------------------------------------------------------------------------

describe('TaskDetailPage — add comment', () => {
  it('submits a new comment via POST /tasks/1/comments', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'POST' && path === '/tasks/1/comments') {
        return Promise.resolve({
          id: 'c3',
          body: 'New comment',
          author: { name: 'Dave' },
          createdAt: new Date().toISOString(),
        });
      }
      if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });

    renderPage();
    await screen.findByText('First comment here');

    const textarea = screen.getByPlaceholderText(/add a comment|write a comment/i);
    await user.type(textarea, 'New comment');
    await user.click(screen.getByRole('button', { name: /add comment|post|submit comment/i }));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tasks/1/comments',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('New comment'),
        }),
      ),
    );
  });

  it('clears the comment textarea after a successful submit', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve({
          id: 'c3',
          body: 'New comment',
          author: { name: 'Dave' },
          createdAt: new Date().toISOString(),
        });
      }
      if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });

    renderPage();
    await screen.findByText('First comment here');

    const textarea = screen.getByPlaceholderText(/add a comment|write a comment/i);
    await user.type(textarea, 'New comment');
    await user.click(screen.getByRole('button', { name: /add comment|post|submit comment/i }));

    await waitFor(() =>
      expect((textarea as HTMLTextAreaElement).value).toBe(''),
    );
  });

  it('does not submit when comment body is empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('First comment here');

    await user.click(screen.getByRole('button', { name: /add comment|post|submit comment/i }));

    expect(mockApiFetch).not.toHaveBeenCalledWith(
      '/tasks/1/comments',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Comments — deleting a comment
// ---------------------------------------------------------------------------

describe('TaskDetailPage — delete comment', () => {
  it('calls DELETE /tasks/1/comments/c1 when delete button is clicked', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return Promise.resolve(null);
      if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });

    renderPage();
    const firstComment = await screen.findByText('First comment here');
    const commentContainer = firstComment.closest('li') ?? firstComment.parentElement!;
    const deleteBtn = within(commentContainer).getByRole('button', { name: /delete/i });
    await user.click(deleteBtn);

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tasks/1/comments/c1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('removes the deleted comment from the list', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return Promise.resolve(null);
      if (path === '/tasks/1/comments') return Promise.resolve(mockComments);
      if (path === '/tasks/1') return Promise.resolve(mockTask);
      return Promise.resolve({});
    });

    renderPage();
    await screen.findByText('First comment here');

    const firstComment = screen.getByText('First comment here');
    const commentContainer = firstComment.closest('li') ?? firstComment.parentElement!;
    const deleteBtn = within(commentContainer).getByRole('button', { name: /delete/i });
    await user.click(deleteBtn);

    await waitFor(() =>
      expect(screen.queryByText('First comment here')).not.toBeInTheDocument(),
    );
  });
});
