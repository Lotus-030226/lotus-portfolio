import {
  AnimationMixer,
  LoopOnce,
  type Object3D,
  type AnimationClip,
  type AnimationAction,
} from 'three';
import type { ModelBinding } from '../../types/content';
export function createModelAnimation(
  root: Object3D,
  clips: AnimationClip[],
  bindings: ModelBinding[],
  mode: 'hover' | 'click',
) {
  const mixer = new AnimationMixer(root);
  const active = new Map<
    string,
    { action: AnimationAction; phase: 'press' | 'release' }
  >();
  let hovered: string | null = null;
  function play(node: string, phase: 'press' | 'release') {
    const binding = bindings.find((b) => b.node === node);
    const clip = clips.find((c) => c.name === binding?.[phase]);
    if (!clip) return;
    active.get(node)?.action.stop();
    const action = mixer.clipAction(clip);
    action.reset().setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    active.set(node, { action, phase });
    action.play();
  }
  // Defer releases until after the mixer finishes its current update.
  const releaseQueue = new Set<string>();
  const finished = ({ action }: { action: AnimationAction }) => {
    if (mode !== 'click') return;
    for (const [node, state] of active)
      if (state.action === action && state.phase === 'press')
        releaseQueue.add(node);
  };
  mixer.addEventListener('finished', finished);
  return {
    hover(node: string | null) {
      if (mode !== 'hover' || hovered === node) return;
      if (hovered) play(hovered, 'release');
      hovered = node;
      if (node) play(node, 'press');
    },
    click(node: string) {
      if (mode === 'click') play(node, 'press');
    },
    update(delta: number) {
      mixer.update(Math.min(delta, 0.16));
      for (const node of releaseQueue) play(node, 'release');
      releaseQueue.clear();
    },
    dispose() {
      mixer.removeEventListener('finished', finished);
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
