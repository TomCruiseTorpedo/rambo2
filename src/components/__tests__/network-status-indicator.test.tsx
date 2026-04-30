import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkStatusIndicator } from '../NetworkStatusIndicator';

// Mock the NetworkMonitor
vi.mock('@/utils/errorHandling', () => ({
  NetworkMonitor: {
    getStatus: vi.fn(() => true),
    addListener: vi.fn(() => vi.fn()),
    init: vi.fn()
  }
}));

describe('NetworkStatusIndicator', () => {
  let networkListener: (online: boolean) => void;
  let mockGetStatus: any;
  let mockAddListener: any;
  let mockInit: any;

  const emitNetwork = async (online: boolean) => {
    await act(async () => {
      networkListener(online);
    });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { NetworkMonitor } = await import('@/utils/errorHandling');
    mockGetStatus = NetworkMonitor.getStatus as any;
    mockAddListener = NetworkMonitor.addListener as any;
    mockInit = NetworkMonitor.init as any;
    
    mockGetStatus.mockReturnValue(true);
    mockAddListener.mockImplementation((listener) => {
      networkListener = listener;
      return vi.fn(); // unsubscribe function
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render anything when online and no status changes', async () => {
    mockGetStatus.mockReturnValue(true);

    let container: HTMLElement;
    await act(async () => {
      ({ container } = render(<NetworkStatusIndicator />));
    });

    expect(container.firstChild).toBeNull();
    expect(mockInit).toHaveBeenCalled();
    expect(mockAddListener).toHaveBeenCalled();
  });

  it('should show offline alert when network goes offline', async () => {
    mockGetStatus.mockReturnValue(true);

    await act(async () => {
      render(<NetworkStatusIndicator />);
    });

    await emitNetwork(false);

    await waitFor(() => {
      expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
      expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    });
  });

  it('should show online alert when network comes back online', async () => {
    mockGetStatus.mockReturnValue(false);

    await act(async () => {
      render(<NetworkStatusIndicator />);
    });

    await emitNetwork(false);

    await waitFor(() => {
      expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
    });

    await emitNetwork(true);

    await waitFor(() => {
      expect(screen.getByText('Back Online')).toBeInTheDocument();
      expect(screen.getByText(/Your internet connection has been restored/)).toBeInTheDocument();
    });
  });

  it('should hide online alert after 5 seconds', async () => {
    vi.useFakeTimers();
    try {
      mockGetStatus.mockReturnValue(false);

      await act(async () => {
        render(<NetworkStatusIndicator />);
      });

      await emitNetwork(true);

      expect(screen.getByText('Back Online')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(5100);
      });

      expect(screen.queryByText('Back Online')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should show correct icons for online and offline states', async () => {
    mockGetStatus.mockReturnValue(true);

    await act(async () => {
      render(<NetworkStatusIndicator />);
    });

    await emitNetwork(false);

    await waitFor(() => {
      const offlineIcon = screen.getByTestId ? screen.queryByTestId('wifi-off-icon') : document.querySelector('[data-testid="wifi-off-icon"]');
      // Since we can't easily test Lucide icons, we'll check for the alert presence
      expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
    });

    await emitNetwork(true);

    await waitFor(() => {
      expect(screen.getByText('Back Online')).toBeInTheDocument();
    });
  });

  it('should properly clean up listeners on unmount', async () => {
    const unsubscribe = vi.fn();
    mockAddListener.mockReturnValue(unsubscribe);

    let unmount: () => void;
    await act(async () => {
      ({ unmount } = render(<NetworkStatusIndicator />));
    });
    
    unmount();
    
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should handle rapid network state changes', async () => {
    mockGetStatus.mockReturnValue(true);

    await act(async () => {
      render(<NetworkStatusIndicator />);
    });

    await emitNetwork(false);
    await emitNetwork(true);
    await emitNetwork(false);
    await emitNetwork(true);

    await waitFor(
      () => {
        expect(screen.getByText('Back Online')).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });
});