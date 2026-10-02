import { expect, test } from 'vitest';
import { AnimationClip, Group, VectorKeyframeTrack } from 'three';
import { createModelAnimation } from '../../src/components/hero/modelAnimation';
const binding = {
  technology: 'Python',
  node: 'PythonKey',
  press: 'press_python',
  release: 'release_python',
};
function setup(mode: 'hover' | 'click') {
  const root = new Group();
  const key = new Group();
  key.name = 'PythonKey';
  root.add(key);
  const clips = [
    new AnimationClip('press_python', 0.16, [
      new VectorKeyframeTrack(
        'PythonKey.position',
        [0, 0.16],
        [0, 0, 0, 0, 0, -4],
      ),
    ]),
    new AnimationClip('release_python', 0.16, [
      new VectorKeyframeTrack(
        'PythonKey.position',
        [0, 0.16],
        [0, 0, -4, 0, 0, 0],
      ),
    ]),
  ];
  return { key, animator: createModelAnimation(root, clips, [binding], mode) };
}
test('hover plays press then release without playing all clips', () => {
  const { key, animator } = setup('hover');
  animator.update(0.2);
  expect(key.position.z).toBe(0);
  animator.hover(binding.node);
  animator.update(0.16);
  expect(key.position.z).toBe(-4);
  animator.hover(null);
  animator.update(0.16);
  expect(key.position.z).toBe(0);
  animator.dispose();
});
test('click automatically releases and hover alone does not press', () => {
  const { key, animator } = setup('click');
  animator.hover(binding.node);
  animator.update(0.16);
  expect(key.position.z).toBe(0);
  animator.click(binding.node);
  animator.update(0.16);
  animator.update(0.16);
  expect(key.position.z).toBe(0);
  animator.dispose();
});
