import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetPath } from '../../lib/utils/paths';
import type { TechItem, ModelBinding } from '../../types/content';
import { createModelAnimation } from './modelAnimation';
export async function createModel(
  host: HTMLDivElement,
  skills: TechItem[],
  select: (id: string) => void,
  url: string,
  bindings: ModelBinding[],
  mode: 'hover' | 'click',
  signal: AbortSignal,
  onFailure: () => void,
): Promise<() => void> {
  // Fetch first: abort cancels loading before allocating WebGL resources.
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = window.setTimeout(abort, 12000);
  let data: ArrayBuffer;
  try {
    if (signal.aborted) throw new Error('Model aborted');
    const response = await fetch(assetPath(url), { signal: controller.signal });
    if (!response.ok) throw new Error('Model unavailable');
    data = await response.arrayBuffer();
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
  const gltf = await new GLTFLoader().parseAsync(data, '');
  const disposeModel = () => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    for (const resource of [...geometries, ...materials, ...textures])
      resource.dispose();
  };
  if (signal.aborted) {
    disposeModel();
    throw new Error('Model aborted');
  }
  const removed: THREE.Object3D[] = [];
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Camera || object instanceof THREE.Light)
      removed.push(object);
  });
  for (const object of removed) object.removeFromParent();
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  if (
    box.isEmpty() ||
    ![...center.toArray(), ...size.toArray()].every(Number.isFinite)
  ) {
    disposeModel();
    throw new Error('Model has no visible geometry');
  }
  const canvas = document.createElement('canvas');
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch (error) {
    disposeModel();
    throw error;
  }
  host.append(canvas);
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const scale = 7.5 / Math.max(size.x, size.y, size.z, 0.001);
  const normalized = new THREE.Group();
  normalized.scale.setScalar(scale);
  normalized.position.copy(center).multiplyScalar(-scale);
  normalized.add(gltf.scene);
  const pivot = new THREE.Group();
  pivot.add(normalized);
  scene.add(pivot);
  scene.add(new THREE.AmbientLight(0xffffff, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-3, 6, 10);
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xb6fff0, 0.7);
  fill.position.set(4, -1, 5);
  scene.add(fill);
  const animator = createModelAnimation(
    gltf.scene,
    gltf.animations,
    bindings,
    mode,
  );
  let disposed = false;
  let frame = 0;
  let inView = true;
  let last = 0;
  let pointerX = 0;
  let pointerY = 0;
  const resize = () => {
    const b = host.getBoundingClientRect();
    renderer.setSize(b.width, b.height, false);
    camera.aspect = b.width / Math.max(b.height, 1);
    const halfHeight = (size.y * scale) / 2;
    const halfWidth = (size.x * scale) / 2;
    camera.position.set(
      0,
      0,
      (Math.max(halfHeight, halfWidth / camera.aspect) /
        Math.tan(THREE.MathUtils.degToRad(16))) *
        1.18 +
        (size.z * scale) / 2,
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  const resizer = new ResizeObserver(resize);
  resizer.observe(host);
  resize();
  const render = (now: number) => {
    if (disposed) return;
    animator.update(last ? (now - last) / 1000 : 0);
    last = now;
    pivot.rotation.y += (pointerX * 0.09 - pivot.rotation.y) * 0.045;
    pivot.rotation.x += (pointerY * 0.05 - pivot.rotation.x) * 0.045;
    renderer.render(scene, camera);
    if (inView && !document.hidden) frame = requestAnimationFrame(render);
  };
  const restart = () => {
    cancelAnimationFrame(frame);
    last = 0;
    if (inView && !document.hidden && !disposed)
      frame = requestAnimationFrame(render);
  };
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) animator.hover(null);
    restart();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', restart);
  const ray = new THREE.Raycaster();
  function hit(event: PointerEvent): ModelBinding | undefined {
    const b = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - b.left) / b.width) * 2 - 1;
    pointerY = ((event.clientY - b.top) / b.height) * 2 - 1;
    scene.updateMatrixWorld(true);
    ray.setFromCamera(new THREE.Vector2(pointerX, -pointerY), camera);
    const object = ray.intersectObject(gltf.scene, true)[0]?.object;
    for (
      let node: THREE.Object3D | undefined = object;
      node;
      node = node.parent || undefined
    ) {
      const binding = bindings.find(
        (b) => b.node === node!.userData.name || b.node === node!.name,
      );
      if (binding) return binding;
    }
  }
  const pointer = (event: PointerEvent) => {
    const binding = hit(event);
    canvas.title = binding?.technology || '';
    animator.hover(binding?.node || null);
  };
  const leave = () => {
    pointerX = 0;
    pointerY = 0;
    canvas.title = '';
    animator.hover(null);
  };
  const click = (event: PointerEvent) => {
    const binding = hit(event);
    if (!binding) return;
    animator.click(binding.node);
    const name = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const skill = skills.find(
      (s) =>
        s.sceneObjectName === binding.node ||
        name(s.name) === name(binding.technology),
    );
    if (skill) select(skill.id);
  };
  canvas.addEventListener('pointermove', pointer);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointerup', click);
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizer.disconnect();
    signal.removeEventListener('abort', cleanup);
    document.removeEventListener('visibilitychange', restart);
    canvas.removeEventListener('pointermove', pointer);
    canvas.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('pointerup', click);
    animator.dispose();
    disposeModel();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
  signal.addEventListener('abort', cleanup, { once: true });
  canvas.addEventListener(
    'webglcontextlost',
    () => {
      if (!disposed) {
        cleanup();
        onFailure();
      }
    },
    { once: true },
  );
  restart();
  return cleanup;
}
