import { afterEach, expect, test, vi } from 'vitest';
import {
  isSplinePublicUrl,
  embedSpline,
} from '../../src/components/hero/splineEmbed';
class Frame extends EventTarget {
  src = '';
  title = '';
  remove = vi.fn();
}
function setup() {
  const frame = new Frame();
  vi.stubGlobal('document', { createElement: () => frame });
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  const host = { append: vi.fn() } as unknown as HTMLDivElement;
  return { frame, host, controller: new AbortController() };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
test('only Spline public pages use the embed renderer', () => {
  expect(isSplinePublicUrl('https://my.spline.design/keyboard-abc/')).toBe(
    true,
  );
  for (const url of [
    'https://prod.spline.design/abc/scene.splinecode',
    '/assets/scene.splinecode',
    'https://my.spline.design.evil.test/x',
    'http://my.spline.design/x',
  ])
    expect(isSplinePublicUrl(url)).toBe(false);
});
test('public page becomes ready on load and disposal removes it', async () => {
  const { frame, host, controller } = setup();
  const pending = embedSpline(
    host,
    'https://my.spline.design/keyboard-abc/',
    controller.signal,
  );
  expect(host.append).toHaveBeenCalledWith(frame);
  expect(frame.src).toBe('https://my.spline.design/keyboard-abc/');
  frame.dispatchEvent(new Event('load'));
  const dispose = await pending;
  dispose();
  expect(frame.remove).toHaveBeenCalledOnce();
});
test('abort during loading removes frame and rejects so fallback survives', async () => {
  const { frame, host, controller } = setup();
  const pending = embedSpline(
    host,
    'https://my.spline.design/keyboard-abc/',
    controller.signal,
  );
  const result = expect(pending).rejects.toThrow('Scene aborted');
  controller.abort();
  await result;
  expect(frame.remove).toHaveBeenCalledOnce();
});
test('unresponsive public page times out and removes frame', async () => {
  vi.useFakeTimers();
  const { frame, host, controller } = setup();
  const pending = embedSpline(
    host,
    'https://my.spline.design/keyboard-abc/',
    controller.signal,
  );
  const result = expect(pending).rejects.toThrow('Scene timeout');
  await vi.advanceTimersByTimeAsync(12000);
  await result;
  expect(frame.remove).toHaveBeenCalledOnce();
});
