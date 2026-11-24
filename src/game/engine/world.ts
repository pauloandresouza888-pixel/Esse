import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import {
  LOT_D, LOT_W, TILE, WALL_HEIGHT, WALL_THICKNESS, gridX, gridZ, isInsideLot,
  objectCenterX, objectCenterZ, tileCenterX, tileCenterZ, tileKey, wallKey,
  worldToEdge, worldToTile,
} from '../constants';
import { getDef, rotatedFootprint, type ObjectDef } from '../data';
import { canPlaceObject, findObject, objectBounds } from '../lot';
import { useGameStore } from '../store';
import type { CameraPreset, FurnitureObject, GameState } from '../types';
import {
  clearArchitectureCache, createGrid, createRoof, rebuildFloors, rebuildWalls, updateWallCutaway,
} from './architecture';
import { Environment } from './environment';
import { buildProp, clearPropCache } from './props';
import {
  animateSimMesh, appearanceKey, buildSimMesh, makeSimLabelSprite, updateSimLabelSprite,
} from './simMesh';
import { disposeMaterials } from './materials';
import { configureTextures, disposeTextures } from './textures';
import { disposeObject } from './primitives';

interface SimEntry {
  group: THREE.Group;
  label: THREE.Sprite;
  appearanceKey: string;
}

interface CameraTween {
  from: THREE.Vector3;
  to: THREE.Vector3;
  targetFrom: THREE.Vector3;
  targetTo: THREE.Vector3;
  t: number;
  duration: number;
}

interface PickResult { objectId?: string; simId?: string; point: THREE.Vector3 }

export class GameWorld {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer?: EffectComposer;
  private bloomPass?: UnrealBloomPass;
  private smaaPass?: SMAAPass;
  private environment: Environment;
  private floorsGroup = new THREE.Group();
  private wallsGroup = new THREE.Group();
  private propsGroup = new THREE.Group();
  private simsGroup = new THREE.Group();
  private overlayGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private grid: THREE.GridHelper;
  private roof: THREE.Group;
  private selectionRing: THREE.Mesh;
  private activeSimRing: THREE.Mesh;
  private tileHighlight: THREE.Mesh;
  private edgeHighlight: THREE.Mesh;
  private roomPreview: THREE.Mesh;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;
  private unsubscribe?: () => void;
  private resizeObserver?: ResizeObserver;
  private envTexture?: THREE.Texture;
  private pmrem?: THREE.PMREMGenerator;

  private floorDirty = true;
  private wallDirty = true;
  private propDirty = true;
  private propMeshes = new Map<string, { group: THREE.Group; key: string }>();
  private simMeshes = new Map<string, SimEntry>();

  private hoverTile: { x: number; z: number } | null = null;
  private hoverEdge: { axis: 'h' | 'v'; x: number; z: number } | null = null;
  private hoverPoint = new THREE.Vector3();
  private lastHoverKey = '';
  private ghostKey = '';
  private lastSettingsKey = '';
  private lastQuality = '';

  private buildPointerDown = false;
  private livePointerStart: { x: number; y: number } | null = null;
  private pointerId: number | null = null;
  private paintDrag = false;
  private roomDrag = false;
  private dragObjectId: string | null = null;
  private lastPaintKey = '';

  private cameraTween: CameraTween | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    configureTextures(this.renderer.capabilities.getMaxAnisotropy());

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 400);
    this.camera.position.set(18, 15.5, 22);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.8, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 58;
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = Math.PI / 2.08;
    this.controls.screenSpacePanning = false;
    this.controls.panSpeed = 0.75;
    this.controls.rotateSpeed = 0.62;
    this.controls.zoomSpeed = 0.85;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.update();

    // Reflexos neutros de estúdio para vidro, metais e cerâmicas.
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const envTarget = this.pmrem.fromScene(room, 0.04);
    this.envTexture = envTarget.texture;
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.9;
    this.pmrem.dispose();
    (room as unknown as { dispose?: () => void }).dispose?.();

    try {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.62, 0.9);
      this.composer.addPass(this.bloomPass);
      this.smaaPass = new SMAAPass();
      this.composer.addPass(this.smaaPass);
      this.composer.addPass(new OutputPass());
      this.composer.setSize(width, height);
    } catch {
      this.composer = undefined;
    }

    this.environment = new Environment(this.scene);

    this.floorsGroup.name = 'Pisos';
    this.wallsGroup.name = 'Paredes';
    this.propsGroup.name = 'Mobília';
    this.simsGroup.name = 'Moradores';
    this.overlayGroup.name = 'Seleção';
    this.ghostGroup.name = 'Pré-visualização';
    this.scene.add(this.floorsGroup, this.wallsGroup, this.propsGroup, this.simsGroup, this.overlayGroup, this.ghostGroup);

    this.grid = createGrid();
    this.roof = createRoof();
    this.scene.add(this.grid, this.roof);

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.52, 64),
      new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.visible = false;
    this.selectionRing.renderOrder = 8;

    this.activeSimRing = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.43, 48),
      new THREE.MeshBasicMaterial({ color: '#8ecbff', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.activeSimRing.rotation.x = -Math.PI / 2;
    this.activeSimRing.position.y = 0.07;
    this.activeSimRing.visible = false;
    this.activeSimRing.renderOrder = 8;

    this.tileHighlight = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE * 0.96, TILE * 0.96),
      new THREE.MeshBasicMaterial({ color: '#78e6a8', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.tileHighlight.rotation.x = -Math.PI / 2;
    this.tileHighlight.position.y = 0.075;
    this.tileHighlight.visible = false;
    this.tileHighlight.renderOrder = 9;

    this.edgeHighlight = new THREE.Mesh(
      new THREE.BoxGeometry(TILE, WALL_HEIGHT, WALL_THICKNESS + 0.08),
      new THREE.MeshBasicMaterial({ color: '#78e6a8', transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false }),
    );
    this.edgeHighlight.visible = false;
    this.edgeHighlight.renderOrder = 9;

    this.roomPreview = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.roomPreview.rotation.x = -Math.PI / 2;
    this.roomPreview.position.y = 0.08;
    this.roomPreview.visible = false;
    this.roomPreview.renderOrder = 9;

    this.overlayGroup.add(this.selectionRing, this.activeSimRing, this.tileHighlight, this.edgeHighlight, this.roomPreview);

    this.container.addEventListener('pointerdown', this.onPointerDown, true);
    this.container.addEventListener('pointermove', this.onPointerMove, true);
    this.container.addEventListener('pointerup', this.onPointerUp, true);
    this.container.addEventListener('pointercancel', this.onPointerCancel, true);
    this.container.addEventListener('dblclick', this.onDoubleClick, true);
    this.container.addEventListener('contextmenu', this.onContextMenu, true);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('aurora:screenshot', this.onScreenshot as EventListener);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(container);
    }

    this.unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.lot.floors !== prev.lot.floors) this.floorDirty = true;
      if (state.lot.walls !== prev.lot.walls) this.wallDirty = true;
      if (state.lot.objects !== prev.lot.objects) this.propDirty = true;
      if (state.ui.cameraNonce !== prev.ui.cameraNonce) this.applyCameraPreset(state.ui.cameraPreset);
      if (state.ui.focusNonce !== prev.ui.focusNonce && state.ui.focusSimId) this.focusOnSim(state.ui.focusSimId);
    });

    this.animate();
  }

  private layerHeight(def: ObjectDef) {
    if (def.layer === 'surface') return 0.9;
    if (def.layer === 'wall') return def.model === 'ceilingLamp' ? 2.55 : 1.62;
    if (def.layer === 'floor') return 0.08;
    return 0;
  }

  private rebuildIfDirty(state: GameState) {
    if (this.floorDirty) {
      rebuildFloors(state.lot, this.floorsGroup);
      this.floorDirty = false;
    }
    if (this.wallDirty) {
      rebuildWalls(state.lot, this.wallsGroup);
      this.wallDirty = false;
    }
    if (this.propDirty) {
      this.rebuildProps(state);
      this.propDirty = false;
    }
  }

  private rebuildProps(state: GameState) {
    while (this.propsGroup.children.length) {
      const child = this.propsGroup.children[0];
      this.propsGroup.remove(child);
      disposeObject(child);
    }
    this.propMeshes.clear();
    state.lot.objects.forEach((object) => {
      const def = getDef(object.defId);
      const [w, d] = rotatedFootprint(def, object.rotation);
      const group = buildProp(object);
      group.position.set(objectCenterX(object.x, w), this.layerHeight(def), objectCenterZ(object.z, d));
      group.rotation.y = (object.rotation * Math.PI) / 2;
      group.userData.objectId = object.id;
      group.userData.selectable = true;
      this.propsGroup.add(group);
      this.propMeshes.set(object.id, { group, key: `${object.defId}|${object.x}|${object.z}|${object.rotation}|${object.color}` });
    });
  }

  private syncSims(state: GameState, dt: number) {
    const ids = new Set(state.sims.map((s) => s.id));
    this.simMeshes.forEach((entry, id) => {
      if (!ids.has(id)) this.disposeSimEntry(id, entry);
    });

    state.sims.forEach((sim) => {
      const key = appearanceKey(sim.appearance);
      const target = new THREE.Vector3(tileCenterX(sim.position.x), 0, tileCenterZ(sim.position.z));
      let entry = this.simMeshes.get(sim.id);
      if (entry && entry.appearanceKey !== key) {
        this.disposeSimEntry(sim.id, entry);
        entry = undefined;
      }
      if (!entry) {
        const group = buildSimMesh(sim.appearance);
        group.position.copy(target);
        group.userData.simId = sim.id;
        const label = makeSimLabelSprite(sim);
        group.add(label);
        this.simsGroup.add(group);
        entry = { group, label, appearanceKey: key };
        this.simMeshes.set(sim.id, entry);
      }
      const distance = entry.group.position.distanceTo(target);
      const alpha = 1 - Math.exp(-dt * 11);
      entry.group.position.lerp(target, alpha);
      entry.group.rotation.y = this.lerpAngle(entry.group.rotation.y, sim.facing, Math.min(1, dt * 9));
      entry.group.visible = !sim.atWork;
      entry.label.visible = state.settings.showLabels && !sim.atWork && !state.ui.photoMode;
      updateSimLabelSprite(entry.label, sim);
      animateSimMesh(entry.group, dt, {
        moving: distance > 0.035,
        pose: sim.activity?.pose ?? (sim.atWork ? 'work' : 'stand'),
        atWork: sim.atWork,
        mood: sim.mood,
      });
    });
  }

  private disposeSimEntry(id: string, entry: SimEntry) {
    this.simsGroup.remove(entry.group);
    disposeObject(entry.group);
    if (entry.label.parent) entry.label.parent.remove(entry.label);
    entry.label.material.map?.dispose();
    entry.label.material.dispose();
    this.simMeshes.delete(id);
  }

  private lerpAngle(a: number, b: number, t: number) {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  private setPointerFromEvent(event: PointerEvent | MouseEvent) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private updateHover(event: PointerEvent | MouseEvent) {
    this.setPointerFromEvent(event);
    const point = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, point);
    if (!hit) {
      this.hoverTile = null;
      this.hoverEdge = null;
      return;
    }
    this.hoverPoint.copy(point);
    const tile = worldToTile(point.x, point.z);
    this.hoverTile = isInsideLot(tile.x, tile.z) ? tile : null;
    const edge = worldToEdge(point.x, point.z);
    const edgeValid = edge.axis === 'h'
      ? edge.x >= 0 && edge.x < LOT_W && edge.z >= 0 && edge.z <= LOT_D
      : edge.x >= 0 && edge.x <= LOT_W && edge.z >= 0 && edge.z < LOT_D;
    this.hoverEdge = edgeValid ? edge : null;
    const key = this.hoverTile ? tileKey(this.hoverTile.x, this.hoverTile.z) : 'none';
    if (key !== this.lastHoverKey) {
      this.lastHoverKey = key;
      useGameStore.getState().setHoverTile(this.hoverTile);
    }
  }

  private pickObject(event: PointerEvent | MouseEvent): PickResult | null {
    this.setPointerFromEvent(event);
    const hits = this.raycaster.intersectObjects([this.propsGroup, this.simsGroup], true);
    for (const hit of hits) {
      let node: THREE.Object3D | null = hit.object;
      while (node) {
        const objectId = node.userData.objectId as string | undefined;
        const simId = node.userData.simId as string | undefined;
        if (objectId) return { objectId, point: hit.point };
        if (simId) return { simId, point: hit.point };
        node = node.parent;
      }
    }
    return null;
  }

  private modalOpen(state: GameState) {
    return state.ui.showCAS || state.ui.showSaves || state.ui.showSettings || state.ui.showHelp
      || state.ui.showAchievements || state.ui.showCareers || state.ui.showSplash;
  }

  private onPointerDown = (event: PointerEvent) => {
    if (this.disposed) return;
    const state = useGameStore.getState();
    if (this.modalOpen(state) || state.ui.photoMode) return;
    this.updateHover(event);
    if (this.cameraTween) { this.cameraTween = null; this.controls.enabled = true; }

    if (state.mode === 'build' && event.button === 0 && !event.altKey) {
      event.stopPropagation();
      event.preventDefault();
      this.buildPointerDown = true;
      this.pointerId = event.pointerId;
      this.controls.enabled = false;
      try { this.container.setPointerCapture(event.pointerId); } catch { /* navegador sem captura */ }
      this.handleBuildDown(event);
      return;
    }
    if (event.button === 0) this.livePointerStart = { x: event.clientX, y: event.clientY };
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.disposed) return;
    this.updateHover(event);
    if (this.buildPointerDown && (event.buttons & 1)) {
      event.stopPropagation();
      this.handleBuildMove(event);
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.disposed) return;
    this.updateHover(event);
    if (this.buildPointerDown) {
      event.stopPropagation();
      this.handleBuildUp(event);
      this.buildPointerDown = false;
      this.controls.enabled = true;
      if (this.pointerId !== null) {
        try { this.container.releasePointerCapture(this.pointerId); } catch { /* já liberado */ }
      }
      this.pointerId = null;
      return;
    }
    if (this.livePointerStart) {
      const dx = event.clientX - this.livePointerStart.x;
      const dy = event.clientY - this.livePointerStart.y;
      if (Math.hypot(dx, dy) < 6) this.handleLiveClick(event);
      this.livePointerStart = null;
    }
  };

  private onPointerCancel = () => {
    if (this.buildPointerDown) {
      useGameStore.getState().endStroke();
      this.buildPointerDown = false;
      this.paintDrag = false;
      this.roomDrag = false;
      this.dragObjectId = null;
      this.controls.enabled = true;
    }
    this.livePointerStart = null;
  };

  private onDoubleClick = (event: MouseEvent) => {
    const state = useGameStore.getState();
    if (this.modalOpen(state) || state.mode !== 'live') return;
    const hit = this.pickObject(event);
    if (!hit) return;
    event.preventDefault();
    if (hit.simId) {
      useGameStore.getState().focusSim(hit.simId);
      return;
    }
    if (hit.objectId) {
      const object = findObject(state.lot, hit.objectId);
      if (!object) return;
      const def = getDef(object.defId);
      const interaction = def.interactions[0];
      if (interaction) useGameStore.getState().startInteraction(state.activeSimId, interaction, object.id);
    }
  };

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  private handleBuildDown(event: PointerEvent) {
    const store = useGameStore.getState();
    const state = store;
    const tool = state.build.tool;
    const tile = this.hoverTile;
    const edge = this.hoverEdge;
    const hit = this.pickObject(event);
    this.paintDrag = false;
    this.roomDrag = false;
    this.dragObjectId = null;
    this.lastPaintKey = '';

    if (tool === 'select') {
      store.selectObject(hit?.objectId ?? null);
      return;
    }
    if (tool === 'move') {
      const id = hit?.objectId ?? state.build.selectedObjectId ?? state.selectedObjectId;
      if (id) {
        store.selectObject(id);
        this.dragObjectId = id;
      }
      return;
    }
    if (tool === 'delete') {
      if (hit?.objectId) {
        store.removeObject(hit.objectId);
      } else if (edge) {
        store.startStroke();
        store.setWallKind('erase');
        store.paintWall(edge);
        store.setWallKind('wall');
        store.setBuildTool('delete');
        store.endStroke();
      }
      return;
    }
    if (tool === 'pipette') {
      if (hit?.objectId) {
        const object = findObject(state.lot, hit.objectId);
        if (object) {
          store.setBuild({
            tool: 'place', selectedDefId: object.defId, selectedObjectId: null,
            rotation: object.rotation,
          });
        }
      }
      return;
    }
    if (!tile) return;
    if (tool === 'place') {
      store.placeObject(tile.x, tile.z);
      return;
    }
    if (tool === 'floor') {
      store.startStroke();
      store.paintFloor(tile.x, tile.z);
      this.paintDrag = true;
      this.lastPaintKey = tileKey(tile.x, tile.z);
      return;
    }
    if (tool === 'wall' && edge) {
      store.startStroke();
      store.paintWall(edge);
      this.paintDrag = true;
      this.lastPaintKey = wallKey(edge.axis, edge.x, edge.z);
      return;
    }
    if (tool === 'room') {
      store.setBuild({ roomStart: tile, roomEnd: tile });
      this.roomDrag = true;
    }
  }

  private handleBuildMove(event: PointerEvent) {
    const store = useGameStore.getState();
    const state = store;
    const tile = this.hoverTile;
    const edge = this.hoverEdge;
    void event;
    if (this.roomDrag && tile) {
      store.setBuild({ roomEnd: tile });
      return;
    }
    if (!this.paintDrag || !tile) return;
    if (state.build.tool === 'floor') {
      const key = tileKey(tile.x, tile.z);
      if (key !== this.lastPaintKey) {
        store.paintFloor(tile.x, tile.z);
        this.lastPaintKey = key;
      }
    } else if (state.build.tool === 'wall' && edge) {
      const key = wallKey(edge.axis, edge.x, edge.z);
      if (key !== this.lastPaintKey) {
        store.paintWall(edge);
        this.lastPaintKey = key;
      }
    }
  }

  private handleBuildUp(event: PointerEvent) {
    const store = useGameStore.getState();
    const state = store;
    const tile = this.hoverTile;
    void event;
    if (this.roomDrag && state.build.roomStart && tile) {
      store.createRoom(state.build.roomStart.x, state.build.roomStart.z, tile.x, tile.z);
    }
    if (this.dragObjectId && tile) {
      store.moveObject(this.dragObjectId, tile.x, tile.z);
    }
    if (this.paintDrag) store.endStroke();
    store.endStroke();
    this.paintDrag = false;
    this.roomDrag = false;
    this.dragObjectId = null;
    this.lastPaintKey = '';
  }

  private handleLiveClick(event: PointerEvent) {
    const state = useGameStore.getState();
    if (this.modalOpen(state)) return;
    const hit = this.pickObject(event);
    if (hit?.simId) {
      state.setActiveSim(hit.simId);
      return;
    }
    if (hit?.objectId) {
      state.selectObject(hit.objectId);
      return;
    }
    if (this.hoverTile) {
      state.selectObject(null);
      state.commandMove(this.hoverTile);
    }
  }

  private disposeGhost() {
    while (this.ghostGroup.children.length) {
      const child = this.ghostGroup.children[0];
      child.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
        if (material) {
          (Array.isArray(material) ? material : [material]).forEach((m) => m.dispose());
        }
      });
      this.ghostGroup.remove(child);
    }
    this.ghostGroup.userData = {};
    this.ghostKey = '';
  }

  private buildGhost(defId: string, rotation: number, color: string) {
    this.disposeGhost();
    const def = getDef(defId);
    const [w, d] = rotatedFootprint(def, rotation);
    const fake: FurnitureObject = { id: 'ghost', defId, x: 0, z: 0, rotation: 0, color, variant: 0 };
    const prop = buildProp(fake);
    prop.rotation.y = (rotation * Math.PI) / 2;
    prop.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const cloneMaterial = (material: THREE.Material) => {
        const cloned = material.clone();
        const m = cloned as THREE.Material & { opacity: number; transparent: boolean; depthWrite: boolean };
        m.transparent = true;
        m.opacity = 0.56;
        m.depthWrite = false;
        m.needsUpdate = true;
        return cloned;
      };
      child.material = Array.isArray(child.material) ? child.material.map(cloneMaterial) : cloneMaterial(child.material);
      child.castShadow = false;
      child.receiveShadow = false;
      child.renderOrder = 12;
    });
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: '#78e6a8', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    const base = new THREE.Mesh(new THREE.PlaneGeometry(w * TILE, d * TILE), baseMaterial);
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.006;
    base.renderOrder = 11;
    const outlineMaterial = new THREE.LineBasicMaterial({ color: '#78e6a8', transparent: true, opacity: 0.95, depthTest: false });
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w * TILE, 0.08, d * TILE)), outlineMaterial,
    );
    outline.position.y = 0.045;
    outline.renderOrder = 13;
    this.ghostGroup.add(base, outline, prop);
    this.ghostGroup.userData.baseMaterial = baseMaterial;
    this.ghostGroup.userData.outlineMaterial = outlineMaterial;
    this.ghostGroup.userData.prop = prop;
    this.ghostKey = `${defId}|${rotation}|${color}`;
  }

  private showGhost(state: GameState, defId: string, rotation: number, color: string, ignoreId?: string) {
    const tile = this.hoverTile;
    if (!tile) { this.ghostGroup.visible = false; return; }
    const def = getDef(defId);
    const [w, d] = rotatedFootprint(def, rotation);
    const key = `${defId}|${rotation}|${color}`;
    if (key !== this.ghostKey) this.buildGhost(defId, rotation, color);
    const check = canPlaceObject(state.lot, defId, tile.x, tile.z, rotation, ignoreId);
    const valid = check.ok && (!!ignoreId || state.money >= def.price);
    this.ghostGroup.position.set(objectCenterX(tile.x, w), this.layerHeight(def), objectCenterZ(tile.z, d));
    this.ghostGroup.rotation.y = 0;
    this.ghostGroup.visible = true;
    const tint = new THREE.Color(valid ? '#78e6a8' : '#ff7b7b');
    const base = this.ghostGroup.userData.baseMaterial as THREE.MeshBasicMaterial | undefined;
    const outline = this.ghostGroup.userData.outlineMaterial as THREE.LineBasicMaterial | undefined;
    if (base) base.color.copy(tint);
    if (outline) outline.color.copy(tint);
  }

  private updateOverlays(state: GameState) {
    const photo = state.ui.photoMode;
    const buildMode = state.mode === 'build';
    this.grid.visible = buildMode && state.settings.showGrid && !photo;
    this.roof.visible = state.settings.showRoof;
    this.ghostGroup.visible = false;
    this.tileHighlight.visible = false;
    this.edgeHighlight.visible = false;
    this.roomPreview.visible = false;
    this.selectionRing.visible = false;
    this.activeSimRing.visible = false;

    const selected = state.selectedObjectId ?? state.build.selectedObjectId;
    if (selected && !photo) {
      const object = findObject(state.lot, selected);
      if (object) {
        const b = objectBounds(object);
        this.selectionRing.position.set(objectCenterX(object.x, b.w), 0.075, objectCenterZ(object.z, b.d));
        this.selectionRing.scale.set(b.w * TILE, b.d * TILE, 1);
        this.selectionRing.visible = true;
      }
    }
    const activeSim = state.sims.find((s) => s.id === state.activeSimId);
    if (activeSim && state.mode === 'live' && !photo && !activeSim.atWork) {
      this.activeSimRing.position.x = tileCenterX(activeSim.position.x);
      this.activeSimRing.position.z = tileCenterZ(activeSim.position.z);
      this.activeSimRing.visible = true;
    }
    if (photo || !buildMode || !this.hoverTile) return;

    const tool = state.build.tool;
    if (tool === 'place' && state.build.selectedDefId) {
      const def = getDef(state.build.selectedDefId);
      this.showGhost(state, state.build.selectedDefId, state.build.rotation, def.defaultColor);
    } else if (tool === 'move' && selected) {
      const object = findObject(state.lot, selected);
      if (object) {
        const def = getDef(object.defId);
        this.showGhost(state, object.defId, object.rotation, object.color ?? def.defaultColor, object.id);
      }
    } else if (tool === 'floor') {
      const brush = state.build.brushSize;
      const half = Math.floor((brush - 1) / 2);
      this.tileHighlight.position.set(objectCenterX(this.hoverTile.x - half, brush), 0.075, objectCenterZ(this.hoverTile.z - half, brush));
      this.tileHighlight.scale.set(brush, brush, 1);
      this.tileHighlight.visible = true;
    } else if (tool === 'wall' && this.hoverEdge) {
      const edge = this.hoverEdge;
      const isH = edge.axis === 'h';
      this.edgeHighlight.position.set(
        isH ? gridX(edge.x + 0.5) : gridX(edge.x),
        WALL_HEIGHT / 2,
        isH ? gridZ(edge.z) : gridZ(edge.z + 0.5),
      );
      this.edgeHighlight.rotation.y = isH ? 0 : Math.PI / 2;
      const kind = state.build.wallKind;
      (this.edgeHighlight.material as THREE.MeshBasicMaterial).color.set(
        kind === 'erase' ? '#ff7b7b' : kind === 'door' ? '#ffcf8a' : kind === 'window' ? '#8ecbff' : '#78e6a8',
      );
      this.edgeHighlight.visible = true;
    } else if (tool === 'room' && state.build.roomStart) {
      const start = state.build.roomStart;
      const end = state.build.roomEnd ?? this.hoverTile;
      const ax = Math.min(start.x, end.x); const az = Math.min(start.z, end.z);
      const bx = Math.max(start.x, end.x); const bz = Math.max(start.z, end.z);
      const w = bx - ax + 1; const d = bz - az + 1;
      this.roomPreview.position.set(objectCenterX(ax, w), 0.08, objectCenterZ(az, d));
      this.roomPreview.scale.set(w * TILE, d * TILE, 1);
      this.roomPreview.visible = true;
    }
  }

  private updateSettings(state: GameState) {
    const key = [
      state.settings.quality, state.settings.shadows, state.settings.showGrid,
      state.settings.showRoof, state.settings.showLabels, state.mode, state.ui.photoMode,
    ].join('|');
    if (key === this.lastSettingsKey) return;
    this.lastSettingsKey = key;
    const qualityChanged = this.lastQuality !== state.settings.quality;
    this.lastQuality = state.settings.quality;
    if (qualityChanged) this.applyQuality(state.settings.quality);
    this.renderer.shadowMap.enabled = state.settings.shadows;
    if (this.bloomPass) this.bloomPass.enabled = state.settings.quality === 'high';
    if (this.smaaPass) this.smaaPass.enabled = state.settings.quality === 'high';
    this.roof.visible = state.settings.showRoof;
    this.grid.visible = state.mode === 'build' && state.settings.showGrid && !state.ui.photoMode;
  }

  private applyQuality(quality: 'low' | 'high') {
    const ratio = quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.renderer.setPixelRatio(ratio);
    if (this.composer && 'setPixelRatio' in this.composer) {
      (this.composer as EffectComposer & { setPixelRatio: (r: number) => void }).setPixelRatio(ratio);
    }
    this.onResize();
  }

  private applyCameraPreset(preset: CameraPreset) {
    const target = new THREE.Vector3(0, 0.8, 0);
    let position = new THREE.Vector3(18, 15.5, 22);
    if (preset === 'front') position = new THREE.Vector3(0, 10.5, 30);
    if (preset === 'garden') { position = new THREE.Vector3(-20, 12, 17); target.set(gridX(18), 1, gridZ(12)); }
    if (preset === 'top') position = new THREE.Vector3(0.1, 34, 0.1);
    if (preset === 'cinema') position = new THREE.Vector3(11, 6.5, 16);
    this.startCameraTween(position, target, 0.95);
  }

  private focusOnSim(id: string) {
    const state = useGameStore.getState();
    const sim = state.sims.find((s) => s.id === id);
    if (!sim) return;
    const target = new THREE.Vector3(tileCenterX(sim.position.x), 1.1, tileCenterZ(sim.position.z));
    const position = target.clone().add(new THREE.Vector3(5.5, 4.4, 7.2));
    this.startCameraTween(position, target, 0.85);
  }

  private startCameraTween(to: THREE.Vector3, targetTo: THREE.Vector3, duration: number) {
    this.cameraTween = {
      from: this.camera.position.clone(), to: to.clone(),
      targetFrom: this.controls.target.clone(), targetTo: targetTo.clone(),
      t: 0, duration,
    };
    this.controls.enabled = false;
  }

  private updateCameraTween(dt: number) {
    if (!this.cameraTween) return;
    const tween = this.cameraTween;
    tween.t = Math.min(1, tween.t + dt / tween.duration);
    const eased = tween.t * tween.t * (3 - 2 * tween.t);
    this.camera.position.lerpVectors(tween.from, tween.to, eased);
    this.controls.target.lerpVectors(tween.targetFrom, tween.targetTo, eased);
    if (tween.t >= 1) {
      this.cameraTween = null;
      this.controls.enabled = true;
    }
  }

  private onResize = () => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer?.setSize(width, height);
  };

  private onScreenshot = () => {
    if (this.disposed) return;
    const state = useGameStore.getState();
    if (state.settings.quality === 'high' && this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    try {
      const url = this.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `aurora-foto-dia-${state.clock.day}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      state.notify('Foto capturada', 'A imagem PNG foi baixada.', 'success', '📸');
    } catch {
      state.notify('Não foi possível capturar', 'O navegador bloqueou a exportação da imagem.', 'warning', '📸');
    }
  };

  private animate = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const before = useGameStore.getState();
    before.advance(dt);
    const state = useGameStore.getState();

    this.environment.update(dt, state);
    this.rebuildIfDirty(state);
    this.syncSims(state, dt);
    updateWallCutaway(this.wallsGroup, this.camera, dt);
    this.updateSettings(state);
    this.updateOverlays(state);
    this.updateCameraTween(dt);
    if (!this.cameraTween) this.controls.update();

    if (state.settings.quality === 'high' && this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    this.container.removeEventListener('pointerdown', this.onPointerDown, true);
    this.container.removeEventListener('pointermove', this.onPointerMove, true);
    this.container.removeEventListener('pointerup', this.onPointerUp, true);
    this.container.removeEventListener('pointercancel', this.onPointerCancel, true);
    this.container.removeEventListener('dblclick', this.onDoubleClick, true);
    this.container.removeEventListener('contextmenu', this.onContextMenu, true);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('aurora:screenshot', this.onScreenshot as EventListener);

    this.controls.dispose();
    this.environment.dispose();
    this.disposeGhost();
    this.simMeshes.forEach((entry, id) => this.disposeSimEntry(id, entry));
    [this.floorsGroup, this.wallsGroup, this.propsGroup, this.simsGroup, this.overlayGroup].forEach((group) => {
      while (group.children.length) {
        const child = group.children[0];
        group.remove(child);
        disposeObject(child);
      }
    });
    this.propMeshes.clear();
    (this.composer as unknown as { dispose?: () => void })?.dispose?.();
    this.envTexture?.dispose();
    this.pmrem?.dispose();
    disposeMaterials();
    disposeTextures();
    clearPropCache();
    clearArchitectureCache();
    this.scene.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) this.container.removeChild(this.renderer.domElement);
  }
}
