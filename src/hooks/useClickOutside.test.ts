import type { RefObject } from 'react';
import type * as React from 'react';

import useOnClickOutside from './useClickOutside';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { cleanups } = vi.hoisted(() => ({ cleanups: [] as Array<() => void> }));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();

  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)): void => {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    },
  };
});

type Listener = (event: MouseEvent | TouchEvent) => void;

const listeners = new Map<string, Listener[]>();

const listenersFor = (type: string): Listener[] => listeners.get(type) ?? [];

const fire = (type: string, event: MouseEvent | TouchEvent): void => {
  for (const listener of listenersFor(type)) listener(event);
};

class FakeNode {
  private readonly children = new Set<object>();

  append(child: object): void {
    this.children.add(child);
  }

  contains(target: unknown): boolean {
    return this.children.has(target as object);
  }
}

const toElement = (node: FakeNode): HTMLElement => node as unknown as HTMLElement;

const toEvent = (target: unknown): MouseEvent => ({ target }) as unknown as MouseEvent;

const setGlobalNode = (value: unknown): void => {
  (globalThis as unknown as { Node?: unknown }).Node = value;
};

describe('useOnClickOutside', () => {
  beforeEach(() => {
    listeners.clear();
    cleanups.length = 0;
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      enumerable: true,
      value: {
        addEventListener: vi.fn((type: string, listener: Listener) => {
          listeners.set(type, [...listenersFor(type), listener]);
        }),
        removeEventListener: vi.fn((type: string, listener: Listener) => {
          listeners.set(
            type,
            listenersFor(type).filter((registered) => registered !== listener),
          );
        }),
      },
      writable: true,
    });
    setGlobalNode(FakeNode);
  });

  afterEach(() => {
    delete (globalThis as unknown as { document?: unknown }).document;
    setGlobalNode(undefined);
  });

  it('registers mousedown and touchstart listeners', () => {
    const reference: RefObject<HTMLElement | null> = { current: toElement(new FakeNode()) };

    useOnClickOutside(reference as RefObject<HTMLElement>, () => {});

    expect(listenersFor('mousedown')).toHaveLength(1);
    expect(listenersFor('touchstart')).toHaveLength(1);
  });

  it('calls the handler for outside mousedown and touchstart events', () => {
    const container = new FakeNode();
    const inner = new FakeNode();
    container.append(inner);
    const outside = new FakeNode();
    const reference: RefObject<HTMLElement | null> = { current: toElement(container) };
    const handler = vi.fn();

    useOnClickOutside(reference as RefObject<HTMLElement>, handler);
    fire('mousedown', toEvent(outside));
    fire('touchstart', toEvent(outside));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('ignores clicks inside the referenced element', () => {
    const container = new FakeNode();
    const inner = new FakeNode();
    container.append(inner);
    const reference: RefObject<HTMLElement | null> = { current: toElement(container) };
    const handler = vi.fn();

    useOnClickOutside(reference as RefObject<HTMLElement>, handler);
    fire('mousedown', toEvent(inner));

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores events when the reference is empty or the target is not a node', () => {
    const empty: RefObject<HTMLElement | null> = { current: null };
    const handler = vi.fn();

    useOnClickOutside(empty as RefObject<HTMLElement>, handler);
    fire('mousedown', toEvent(new FakeNode()));

    const container = new FakeNode();
    const filled: RefObject<HTMLElement | null> = { current: toElement(container) };

    useOnClickOutside(filled as RefObject<HTMLElement>, handler);
    fire('mousedown', { target: 'not-a-node' } as unknown as MouseEvent);

    expect(handler).not.toHaveBeenCalled();
  });

  it('removes both listeners on cleanup', () => {
    const documentWithSpies = (globalThis as unknown as { document: Document }).document;
    const addSpy = vi.spyOn(documentWithSpies, 'addEventListener');
    const removeSpy = vi.spyOn(documentWithSpies, 'removeEventListener');
    const reference: RefObject<HTMLElement | null> = { current: toElement(new FakeNode()) };

    useOnClickOutside(reference as RefObject<HTMLElement>, () => {});
    const cleanup = cleanups.at(-1);

    expect(cleanup).toBeTypeOf('function');
    cleanup?.();

    expect(addSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(listenersFor('mousedown')).toHaveLength(0);
    expect(listenersFor('touchstart')).toHaveLength(0);
  });
});
