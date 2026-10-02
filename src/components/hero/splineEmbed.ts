export function isSplinePublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'my.spline.design';
  } catch {
    return false;
  }
}

// Public URLs contain an HTML viewer; only code exports can use Application.load.
export async function embedSpline(
  host: HTMLDivElement,
  url: string,
  signal: AbortSignal,
): Promise<() => void> {
  if (signal.aborted) throw new Error('Scene aborted');
  const frame = document.createElement('iframe');
  frame.title = 'Spline 3D keyboard';
  frame.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        window.clearTimeout(timer);
        frame.removeEventListener('load', loaded);
        frame.removeEventListener('error', failed);
        signal.removeEventListener('abort', aborted);
        if (error) reject(error);
        else resolve();
      };
      const loaded = () => finish();
      const failed = () => finish(new Error('Scene failed'));
      const aborted = () => finish(new Error('Scene aborted'));
      const timer = window.setTimeout(
        () => finish(new Error('Scene timeout')),
        12000,
      );
      frame.addEventListener('load', loaded, { once: true });
      frame.addEventListener('error', failed, { once: true });
      signal.addEventListener('abort', aborted, { once: true });
      host.append(frame);
    });
  } catch (error) {
    frame.remove();
    throw error;
  }
  return () => frame.remove();
}
