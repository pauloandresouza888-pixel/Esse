import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Appearance } from '../game/types';
import { configureTextures } from '../game/engine/textures';
import { buildSimMesh, appearanceKey } from '../game/engine/simMesh';
import { disposeObject } from '../game/engine/primitives';

interface PreviewEngine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group | null;
  pedestal: THREE.Mesh;
  ring: THREE.Mesh;
  raf: number;
}

export function SimPreview({ appearance }: { appearance: Appearance }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const key = appearanceKey(appearance);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);
    configureTextures(renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), 0.1, 30);
    camera.position.set(0, 1.55, 4.5);
    camera.lookAt(0, 1.02, 0);
    scene.add(new THREE.HemisphereLight('#e8f4ff', '#4a3a30', 1.5));
    const keyLight = new THREE.DirectionalLight('#fff0d5', 2.1);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const rim = new THREE.PointLight('#8ecbff', 1.4, 10);
    rim.position.set(-2.5, 2.5, -2.5);
    scene.add(rim);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.82, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: '#26333d', roughness: 0.45, metalness: 0.35 }),
    );
    pedestal.position.y = -0.06;
    scene.add(pedestal);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.018, 8, 64),
      new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0.85, toneMapped: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.015;
    scene.add(ring);

    const engine: PreviewEngine = { renderer, scene, camera, group: null, pedestal, ring, raf: 0 };
    engineRef.current = engine;
    const clock = new THREE.Clock();
    const animate = () => {
      engine.raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (engine.group) engine.group.rotation.y += dt * 0.42;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(performance.now() * 0.002) * 0.12;
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      })
      : null;
    resizeObserver?.observe(host);

    return () => {
      cancelAnimationFrame(engine.raf);
      resizeObserver?.disconnect();
      if (engine.group) {
        scene.remove(engine.group);
        disposeObject(engine.group);
      }
      [pedestal, ring].forEach((mesh) => {
        mesh.geometry.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.group) {
      engine.scene.remove(engine.group);
      disposeObject(engine.group);
    }
    const group = buildSimMesh(appearance);
    group.rotation.y = -0.35;
    engine.group = group;
    engine.scene.add(group);
  }, [key]);

  return <div className="sim-preview-canvas" ref={hostRef} aria-label="Pré-visualização 3D do morador" />;
}
