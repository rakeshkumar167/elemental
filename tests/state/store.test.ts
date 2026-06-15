import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must stub Worker and URL before importing store
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null as ((e: MessageEvent) => void) | null,
};
vi.stubGlobal('Worker', vi.fn(function() { return mockWorker; }));
vi.stubGlobal('URL', class {
  constructor(public href: string, _base?: string) {}
  toString() { return this.href; }
  static createObjectURL = vi.fn();
});

const { useStore } = await import('../../src/state/store');

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      status: 'idle',
      snapshot: null,
      history: [],
      error: null,
      worker: null,
    });
    vi.clearAllMocks();
  });

  it('setConfig updates config n', () => {
    useStore.getState().setConfig({ n: 20 });
    expect(useStore.getState().config.n).toBe(20);
  });

  it('start creates a worker and sets status to running', () => {
    useStore.getState().start();
    expect(useStore.getState().status).toBe('running');
    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'start' })
    );
  });

  it('pause sends pause command and sets status to paused', () => {
    useStore.setState({ status: 'running', worker: mockWorker as unknown as Worker });
    useStore.getState().pause();
    expect(useStore.getState().status).toBe('paused');
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'pause' });
  });

  it('reset terminates the worker and returns to idle', () => {
    useStore.setState({ status: 'running', worker: mockWorker as unknown as Worker });
    useStore.getState().reset();
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().snapshot).toBeNull();
  });
});
