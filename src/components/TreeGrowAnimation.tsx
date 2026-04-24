/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TreeGrowAnimation — Three.js 3D 树木成长动画组件
 * 
 * 打卡成功后展示的 3D 动画：水壶浇水 → 小树苗逐步成长为参天大树
 * 
 * 动画时间线（约 7 秒）：
 *   0.0s - 1.0s：水壶从右侧飞入
 *   1.0s - 2.5s：水壶倾倒浇水，水滴从壶嘴尖端喷出
 *   2.5s - 3.2s：水壶飞出，地面出现浇水涟漪
 *   2.0s - 5.5s：树苗从地面冒出，逐步成长
 *   5.5s - 7.0s：树叶轻微摇摆，果实出现（如已完成），定格
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';
import treeConfig from './tree.json';

interface TreeGrowAnimationProps {
  /** 动画触发开关，true = 开始播放 */
  isActive: boolean;
  /** 动画结束后回调 */
  onComplete?: () => void;
}

export default function TreeGrowAnimation({
  isActive,
  onComplete,
}: TreeGrowAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock | null>(null);
  const stateRef = useRef<'idle' | 'watering' | 'growing' | 'done'>('idle');
  const startTimeRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  // 所有 3D 对象引用
  const objectsRef = useRef<{
    treeGroup: THREE.Group;
    trunk: THREE.Mesh;
    canopyMeshes: THREE.Mesh[];
    wateringCan: THREE.Group;
    spoutTip: THREE.Object3D;
    waterDrops: THREE.Mesh[];
    ground: THREE.Mesh;
    groundRipple: THREE.Mesh;
    fruits: THREE.Mesh[];
    flowers: THREE.Mesh[];
    sun: THREE.Mesh;
  }>({
    treeGroup: new THREE.Group(),
    trunk: new THREE.Mesh(),
    canopyMeshes: [],
    wateringCan: new THREE.Group(),
    spoutTip: new THREE.Object3D(),
    waterDrops: [],
    ground: new THREE.Mesh(),
    groundRipple: new THREE.Mesh(),
    fruits: [],
    flowers: [],
    sun: new THREE.Mesh(),
  });

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // 天空蓝
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.02);
    sceneRef.current = scene;

    // 相机 — 为更高、更完整的树冠预留视野
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5, 4.5, 8);
    camera.lookAt(0, 3.5, 0);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 光照
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sunLight.position.set(5, 8, 3);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 20;
    sunLight.shadow.camera.left = -5;
    sunLight.shadow.camera.right = 5;
    sunLight.shadow.camera.top = 5;
    sunLight.shadow.camera.bottom = -5;
    scene.add(sunLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x4a7c59, 0.4);
    scene.add(hemisphereLight);

    // === 地面 ===
    const groundGeo = new THREE.CircleGeometry(6, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c59,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    objectsRef.current.ground = ground;

    // 地面涟漪（浇水效果）
    const rippleGeo = new THREE.RingGeometry(0.1, 0.3, 32);
    const rippleMat = new THREE.MeshStandardMaterial({
      color: 0x6ba37a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const groundRipple = new THREE.Mesh(rippleGeo, rippleMat);
    groundRipple.rotation.x = -Math.PI / 2;
    groundRipple.position.y = 0.01;
    scene.add(groundRipple);
    objectsRef.current.groundRipple = groundRipple;

    // === 小太阳装饰 ===
    const sunGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(-3.8, 5.6, -3);
    scene.add(sun);
    objectsRef.current.sun = sun;

    // === 水壶 ===
    const wateringCan = createWateringCan();
    wateringCan.position.set(4, 2, 0); // 右侧远处
    wateringCan.visible = false;
    scene.add(wateringCan);
    objectsRef.current.wateringCan = wateringCan;
    // 壶嘴尖端标记 — 水滴从这里喷出
    // ⚠️ spoutTip 挂在 spoutGroup（wateringCan 的子节点）上，必须用 traverse 递归查找
    let foundTip: THREE.Object3D | null = null;
    wateringCan.traverse((child) => {
      if (child.userData.type === 'spoutTip') foundTip = child;
    });
    objectsRef.current.spoutTip = foundTip ?? new THREE.Object3D();

    // === 水滴粒子 ===
    const waterDrops: THREE.Mesh[] = [];
    const dropGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const dropMat = new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.8,
    });
    for (let i = 0; i < 30; i++) {
      const drop = new THREE.Mesh(dropGeo, dropMat);
      drop.visible = false;
      scene.add(drop);
      waterDrops.push(drop);
    }
    objectsRef.current.waterDrops = waterDrops;

    // === 树木组（ez-tree）===
    const treeGroup = createTree() as THREE.Group & { branchesMesh?: THREE.Mesh; leavesMesh?: THREE.Mesh; update?(t: number): void };
    treeGroup.scale.setScalar(0.01); // 种子状态
    treeGroup.position.y = 0;
    scene.add(treeGroup);
    objectsRef.current.treeGroup = treeGroup;
    // ez-tree 的分支和叶子是单独的 mesh
    objectsRef.current.trunk = (treeGroup.branchesMesh ?? new THREE.Mesh()) as THREE.Mesh;
    objectsRef.current.canopyMeshes = treeGroup.leavesMesh ? [treeGroup.leavesMesh as THREE.Mesh] : [];
    objectsRef.current.fruits = treeGroup.children.filter(
      (c) => c.userData.type === 'fruit'
    ) as THREE.Mesh[];
    objectsRef.current.flowers = treeGroup.children.filter(
      (c) => c.userData.type === 'flower'
    ) as THREE.Mesh[];

    // 初始隐藏果实和花朵
    objectsRef.current.fruits.forEach((f) => (f.visible = false));
    objectsRef.current.flowers.forEach((f) => (f.visible = false));

    // 时钟
    clockRef.current = new THREE.Clock();
  }, []);

  // 创建水壶模型（所有部件以壶身中心为原点对齐）
  function createWateringCan(): THREE.Group {
    const group = new THREE.Group();
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x2196F3, roughness: 0.4, metalness: 0.3,
    });

    // === 壶身（圆柱，中心在原点）===
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.55, 20),
      blueMat,
    );
    body.castShadow = true;
    group.add(body);

    // 壶顶盖（让顶部看起来完整）
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.22, 0.06, 20),
      blueMat,
    );
    cap.position.y = 0.30; // 壶顶上方
    cap.castShadow = true;
    group.add(cap);

    // === 把手（半圆弧，从壶身后方跨过顶部）===
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.028, 10, 18, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x1565C0, roughness: 0.4, metalness: 0.3 }),
    );
    // 把手圆弧开口朝前（Z+方向），位于壶身后方
    handle.position.set(0, 0.08, -0.22); // 稍微抬高，在壶身背面
    handle.rotation.x = Math.PI; // 弧形开口朝前（向观察者）
    handle.rotation.z = Math.PI / 2; // 让弧面竖直
    handle.castShadow = true;
    group.add(handle);

    // === 壶嘴组（从壶身上部向前-右侧伸出）===
    const spoutGroup = new THREE.Group();
    // 连接点：壶身右上前方
    spoutGroup.position.set(0.15, 0.20, 0.18);
    // 壶嘴向下倾斜约 15°，这样倾倒时更自然
    spoutGroup.rotation.z = -0.26;

    // 壶嘴管身（锥形管）
    const spoutTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.055, 0.45, 10),
      blueMat,
    );
    spoutTube.rotation.z = -Math.PI / 2; // 水平朝 X+
    spoutTube.position.x = 0.225; // 管身在连接点前方
    spoutTube.castShadow = true;
    spoutGroup.add(spoutTube);

    // 花洒头（玫瑰头，壶嘴末端喇叭口）
    const roseHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.05, 0.07, 14),
      blueMat,
    );
    roseHead.rotation.z = -Math.PI / 2;
    roseHead.position.set(0.46, 0, 0); // 管身末端
    roseHead.castShadow = true;
    spoutGroup.add(roseHead);

    // 壶嘴尖端标记（不渲染，仅用于获取世界坐标）
    const spoutTip = new THREE.Object3D();
    spoutTip.position.set(0.51, 0, 0); // 花洒头最前端
    spoutTip.userData.type = 'spoutTip';
    spoutGroup.add(spoutTip);

    group.add(spoutGroup);

    return group;
  }

  // 使用 ez-tree 创建程序化树木
  function createTree(): THREE.Group {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tree = new Tree(treeConfig as any);
    tree.generate();

    // 标记分支和叶子 mesh 以便动画引用
    if (tree.branchesMesh) tree.branchesMesh.userData.type = 'trunk';
    if (tree.leavesMesh) tree.leavesMesh.userData.type = 'canopy';
    tree.userData.isEzTree = true;

    // === 果实（附加在树上）===
    const fruitPositions: Array<[number, number, number]> = [
      [0.4, 3.5, 0.3], [-0.35, 4.0, 0.25],
      [0.25, 4.4, -0.2], [-0.5, 3.6, -0.25],
      [0.6, 3.9, 0.15],
    ];
    const fruitMat = new THREE.MeshStandardMaterial({
      color: 0xFF5722, roughness: 0.3, metalness: 0.1,
      emissive: 0xFF3300, emissiveIntensity: 0.15,
    });
    fruitPositions.forEach(([x, y, z]) => {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), fruitMat);
      fruit.position.set(x, y, z);
      fruit.userData.type = 'fruit';
      fruit.userData.basePos = new THREE.Vector3(x, y, z);
      fruit.visible = false;
      tree.add(fruit);
    });

    // === 花朵 ===
    const flowerPositions: Array<[number, number, number]> = [
      [0.8, 3.2, 0.5], [-0.9, 3.7, -0.4], [0.35, 4.6, -0.4],
    ];
    flowerPositions.forEach(([x, y, z]) => {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xFFEB3B, roughness: 0.5,
          emissive: 0xFFCC00, emissiveIntensity: 0.1,
        }),
      );
      flower.position.set(x, y, z);
      flower.userData.type = 'flower';
      flower.visible = false;
      tree.add(flower);
    });

    return tree;
  }

  // 动画主循环
  const animate = useCallback(() => {
    if (
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current ||
      !clockRef.current
    )
      return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const clock = clockRef.current;
    const elapsed = clock.getElapsedTime();
    const animElapsed = elapsed - startTimeRef.current;
    const objs = objectsRef.current;

    // === 动画时间线（放慢到约 7 秒） ===

    // Phase 1: 水壶飞入 (0 - 1.0s)
    if (animElapsed < 1.0) {
      objs.wateringCan.visible = true;
      objs.wateringCan.rotation.z = 0; // 不倾斜
      const flyInT = Math.min(animElapsed / 1.0, 1);
      const easedFlyIn = easeOutCubic(flyInT);
      // 水壶从右侧飞入到树木旁边，停在空中
      objs.wateringCan.position.x = 4 - easedFlyIn * 3.0;   // 4 → 1.0
      objs.wateringCan.position.y = 0.5 + easedFlyIn * 2.0;  // 0.5 → 2.5 (抬高到树木上方)
      objs.wateringCan.position.z = 0 + easedFlyIn * 1.5;    // 0 → 1.5 (向前靠近树)
    }

    // Phase 1.5: 水壶倾倒浇水 (1.0s - 2.5s)
    if (animElapsed >= 1.0 && animElapsed < 2.5) {
      objs.wateringCan.visible = true;
      // 位置稳定在树木旁
      objs.wateringCan.position.set(1.0, 2.5, 1.5);
      // 倾倒角度逐渐加大
      const pourT = Math.min((animElapsed - 1.0) / 0.8, 1);
      objs.wateringCan.rotation.z = -pourT * 0.8; // 倾倒约 46°

      // 水滴粒子 — 从壶嘴尖端喷出
      if (animElapsed >= 1.3) {
        const dropSpawnT = animElapsed - 1.3;
        // 用 getWorldPosition 获取壶嘴尖端的真实世界坐标
        const spoutTip = objs.spoutTip;
        const tipWorldPos = new THREE.Vector3();
        spoutTip.getWorldPosition(tipWorldPos);

        objs.waterDrops.forEach((drop, i) => {
          const dropAge = dropSpawnT - i * 0.04;
          if (dropAge > 0 && dropAge < 0.8) {
            drop.visible = true;
            // 水滴从壶嘴尖端出发，向下加速落下（模拟重力）
            drop.position.set(
              tipWorldPos.x + Math.sin(i * 1.3) * 0.08,
              tipWorldPos.y - dropAge * 3.5, // 下落
              tipWorldPos.z + Math.cos(i * 0.9) * 0.08
            );
            const opacity = Math.max(0, 1 - dropAge * 1.5);
            (drop.material as THREE.MeshStandardMaterial).opacity = opacity;
            drop.scale.setScalar(0.8 + Math.random() * 0.3);
          } else {
            drop.visible = false;
          }
        });
      }
    }

    // Phase 2: 水壶飞出 + 涟漪 (2.5s - 3.2s)
    if (animElapsed >= 2.5 && animElapsed < 3.2) {
      const flyOutT = (animElapsed - 2.5) / 0.7;
      const easedFlyOut = easeInCubic(flyOutT);
      objs.wateringCan.position.x = 1.0 + easedFlyOut * 5;
      objs.wateringCan.position.y = 2.5 + easedFlyOut * 1.5;
      objs.wateringCan.rotation.z = -0.8 - easedFlyOut * 0.3;

      // 水滴消失
      objs.waterDrops.forEach((d) => (d.visible = false));

      // 地面涟漪
      if (animElapsed > 2.6) {
        const rippleT = (animElapsed - 2.6) / 0.6;
        const rippleMat = objs.groundRipple.material as THREE.MeshStandardMaterial;
        rippleMat.opacity = Math.max(0, 0.6 - rippleT * 0.6);
        objs.groundRipple.scale.setScalar(1 + rippleT * 3);
        const innerR = 0.1 + rippleT * 0.8;
        const outerR = 0.3 + rippleT * 1.5;
        objs.groundRipple.geometry.dispose();
        objs.groundRipple.geometry = new THREE.RingGeometry(innerR, outerR, 32);
      }
    }

    // Phase 3: 树木成长 (2.0s - 5.5s)
    if (animElapsed >= 2.0 && animElapsed < 5.5) {
      // 隐藏水壶和涟漪
      if (animElapsed >= 3.2) {
        objs.wateringCan.visible = false;
        objs.groundRipple.visible = false;
      }

      const growT = (animElapsed - 2.0) / 3.5; // 0→1 over 3.5 seconds (放慢)
      const easedGrowT = easeOutElastic(Math.min(growT, 1));

      // 直接长成完整大树（基于 tree.json 等比例缩小到合适尺寸）
      const finalScale = 0.1;
      const currentScale = 0.01 + easedGrowT * (finalScale - 0.01);

      objs.treeGroup.scale.setScalar(currentScale);
      objs.treeGroup.position.y = 0;

      // 花朵出现 (成长 30%-60%)
      const flowerAppearT = Math.max(0, Math.min(1, (growT - 0.25) / 0.3));
      objs.flowers.forEach((flower, i) => {
        flower.visible = flowerAppearT > 0;
        const ft = Math.max(0, flowerAppearT - i * 0.1);
        flower.scale.setScalar(easeOutBack(ft) * 0.8);
      });

      // 果实出现 (成长 70%-100%)
      {
        const fruitAppearT = Math.max(0, Math.min(1, (growT - 0.6) / 0.3));
        objs.fruits.forEach((fruit, i) => {
          fruit.visible = fruitAppearT > 0;
          const ft = Math.max(0, fruitAppearT - i * 0.08);
          fruit.scale.setScalar(easeOutBack(ft) * 1.5);
        });
      }

      // 轻微摇摆
      objs.treeGroup.rotation.z = Math.sin(animElapsed * 2) * 0.02;
    }

    // Phase 4: 定格 + 持续微动 (5.5s+)
    if (animElapsed >= 5.5) {
      objs.treeGroup.scale.setScalar(0.1);

      // 水壶和涟漪隐藏
      objs.wateringCan.visible = false;
      objs.groundRipple.visible = false;

      // 持续微摇摆 + 使用 ez-tree 风动效果
      objs.treeGroup.rotation.z = Math.sin(elapsed * 1.5) * 0.01;
      // 调用 ez-tree 内置风动更新（让树叶和枝条自然摇曳）
      if (typeof (objs.treeGroup as any).update === 'function') {
        (objs.treeGroup as any).update(elapsed);
      }

      // 果实微晃
      objs.fruits.forEach((fruit, i) => {
        if (fruit.visible) {
          const basePos = fruit.userData.basePos as THREE.Vector3;
          fruit.position.y = basePos.y + Math.sin(elapsed * 2.5 + i * 0.5) * 0.02;
        }
      });

      // 太阳脉动
      objs.sun.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.05);

      // 7 秒后触发完成回调
      if (animElapsed >= 7.0 && stateRef.current !== 'done') {
        stateRef.current = 'done';
        onComplete?.();
      }
    }

    renderer.render(scene, camera);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [onComplete]);

  // 启动动画
  const startAnimation = useCallback(() => {
    if (!clockRef.current) return;
    stateRef.current = 'watering';
    startTimeRef.current = clockRef.current.getElapsedTime();

    // 重置所有对象状态
    const objs = objectsRef.current;
    objs.treeGroup.scale.setScalar(0.01);
    objs.treeGroup.rotation.z = 0;
    objs.wateringCan.visible = false;
    objs.wateringCan.position.set(4, 0.5, 0);
    objs.wateringCan.rotation.set(0, 0, 0);
    objs.waterDrops.forEach((d) => (d.visible = false));
    objs.groundRipple.visible = true;
    (objs.groundRipple.material as THREE.MeshStandardMaterial).opacity = 0;
    objs.groundRipple.scale.setScalar(1);
    objs.groundRipple.geometry.dispose();
    objs.groundRipple.geometry = new THREE.RingGeometry(0.1, 0.3, 32);
    objs.fruits.forEach((f) => {
      f.visible = false;
      f.scale.setScalar(1);
    });
    objs.flowers.forEach((f) => {
      f.visible = false;
      f.scale.setScalar(1);
    });

    animFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  // 清理
  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
      if (rendererRef.current.domElement.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(
          rendererRef.current.domElement
        );
      }
    }
    // 释放几何体和材质
    if (sceneRef.current) {
      sceneRef.current.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
    }
    rendererRef.current = null;
    sceneRef.current = null;
    cameraRef.current = null;
    clockRef.current = null;
    stateRef.current = 'idle';
  }, []);

  useEffect(() => {
    initScene();
    cleanupRef.current = cleanup;

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupRef.current?.();
    };
  }, [initScene, cleanup]);

  // 触发动画
  useEffect(() => {
    if (isActive && stateRef.current === 'idle' && clockRef.current) {
      startAnimation();
    }
    if (!isActive && stateRef.current !== 'idle') {
      // 重置为 idle，允许下次触发
      cleanup();
      initScene();
      stateRef.current = 'idle';
    }
  }, [isActive, startAnimation, cleanup, initScene]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden"
      style={{ minHeight: '240px', maxHeight: '320px' }}
    />
  );
}

// === 缓动函数 ===

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
