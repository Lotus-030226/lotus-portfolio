import type { TechItem } from '../../types/content';
import { assetPath } from '../../lib/utils/paths';
import { embedSpline, isSplinePublicUrl } from './splineEmbed';
export async function createKeyboard(
  host: HTMLDivElement,
  skills: TechItem[],
  select: (id: string) => void,
  sceneUrl: string | null,
  signal: AbortSignal,
  onFailure: () => void,
): Promise<() => void> {
  if (sceneUrl && isSplinePublicUrl(sceneUrl)) {
    return embedSpline(host, sceneUrl, signal);
  }
  const canvas = document.createElement('canvas');
  host.append(canvas);
  if (sceneUrl) {
    const { Application } = await import('@splinetool/runtime');
    if (signal.aborted) {
      canvas.remove();
      return () => {};
    }
    const app = new Application(canvas, { renderOnDemand: true });
    let timer = 0;
    try {
      await Promise.race([
        app.load(assetPath(sceneUrl)),
        new Promise<never>((_, reject) => {
          timer = window.setTimeout(
            () => reject(new Error('Scene timeout')),
            12000,
          );
          signal.addEventListener(
            'abort',
            () => reject(new Error('Scene aborted')),
            { once: true },
          );
        }),
      ]);
      if (signal.aborted) {
        app.dispose();
        canvas.remove();
        return () => {};
      }
    } catch (e) {
      app.dispose();
      canvas.remove();
      throw e;
    } finally {
      clearTimeout(timer);
    }
    app.addEventListener('mouseDown', (e) => {
      const skill = skills.find((s) => s.sceneObjectName === e.target.name);
      if (skill) select(skill.id);
    });
    const visible = () => {
      if (document.hidden) app.stop();
      else app.play();
    };
    document.addEventListener('visibilitychange', visible);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) app.play();
      else app.stop();
    });
    observer.observe(host);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visible);
      app.dispose();
      canvas.remove();
    };
  }
  const THREE = await import('three');
  if (signal.aborted) {
    canvas.remove();
    return () => {};
  }
  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch (e) {
    canvas.remove();
    throw e;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 6.5, 10);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xd4e9ff, 2.1));
  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(2, 7, 5);
  scene.add(light);
  const cyan = new THREE.PointLight(0x49dbcb, 50);
  cyan.position.set(-4, 2, 2);
  scene.add(cyan);
  const group = new THREE.Group();
  scene.add(group);
  group.rotation.y = -0.18;
  group.rotation.z = 0.09;
  const geometries: InstanceType<typeof THREE.BufferGeometry>[] = [];
  const materials: InstanceType<typeof THREE.Material>[] = [];
  const textures: InstanceType<typeof THREE.Texture>[] = [];
  const bodyGeometry = new THREE.BoxGeometry(7.5, 0.35, 4.45);
  geometries.push(bodyGeometry);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x151e25,
    roughness: 0.45,
    metalness: 0.5,
  });
  materials.push(bodyMaterial);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = -0.22;
  group.add(body);
  const keyGeometry = new THREE.BoxGeometry(1.25, 0.43, 0.88);
  geometries.push(keyGeometry);
  const labelGeometry = new THREE.PlaneGeometry(1.15, 0.76);
  geometries.push(labelGeometry);
  const colors = [0x1a494d, 0x2d345c, 0x1f3948, 0x354449];
  const keys: InstanceType<typeof THREE.Mesh>[] = [];
  skills.slice(0, 20).forEach((skill, i) => {
    const keyMaterial = new THREE.MeshStandardMaterial({
      color: colors[i % 4],
      roughness: 0.4,
      metalness: 0.2,
    });
    materials.push(keyMaterial);
    const key = new THREE.Mesh(keyGeometry, keyMaterial);
    key.position.set(
      ((i % 5) - 2) * 1.4,
      0.16,
      (Math.floor(i / 5) - 1.5) * 1.03,
    );
    key.userData.skillId = skill.id;
    group.add(key);
    keys.push(key);
    const label = document.createElement('canvas');
    label.width = 384;
    label.height = 192;
    const ctx = label.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#edfdf9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${skill.name.length > 10 ? 24 : 34}px sans-serif`;
      ctx.fillText(skill.name, 192, 96, 350);
    }
    const texture = new THREE.CanvasTexture(label);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    materials.push(material);
    const plane = new THREE.Mesh(labelGeometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.222;
    key.add(plane);
  });
  let frame = 0;
  let inView = true;
  let disposed = false;
  let pointerX = 0;
  let pointerY = 0;
  const resize = () => {
    const box = host.getBoundingClientRect();
    renderer.setSize(box.width, box.height, false);
    camera.aspect = box.width / Math.max(box.height, 1);
    camera.updateProjectionMatrix();
  };
  const resizer = new ResizeObserver(resize);
  resizer.observe(host);
  resize();
  const render = () => {
    if (disposed) return;
    group.rotation.y += (-0.18 + pointerX * 0.18 - group.rotation.y) * 0.045;
    group.rotation.x += (pointerY * 0.1 - group.rotation.x) * 0.045;
    renderer.render(scene, camera);
    if (inView && !document.hidden) frame = requestAnimationFrame(render);
  };
  const restart = () => {
    cancelAnimationFrame(frame);
    if (inView && !document.hidden && !disposed) render();
  };
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    restart();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', restart);
  const pointer = (event: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - b.left) / b.width) * 2 - 1;
    pointerY = ((event.clientY - b.top) / b.height) * 2 - 1;
  };
  const click = (event: PointerEvent) => {
    pointer(event);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(pointerX, -pointerY), camera);
    const hit = ray.intersectObjects(keys, false)[0];
    if (hit) select(hit.object.userData.skillId);
  };
  canvas.addEventListener('pointermove', pointer);
  canvas.addEventListener('pointerup', click);
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizer.disconnect();
    document.removeEventListener('visibilitychange', restart);
    canvas.removeEventListener('pointermove', pointer);
    canvas.removeEventListener('pointerup', click);
    for (const item of [...geometries, ...materials, ...textures])
      item.dispose();
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
  render();
  return cleanup;
}
