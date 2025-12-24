
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { AppMode } from '../types';

export class ParticleSystem {
  public group: THREE.Group;
  private mainParticles: THREE.Mesh[] = [];
  private baseFiller!: THREE.Points; 
  private candyCanes: THREE.Mesh[] = [];
  private dust!: THREE.Points;
  private snow!: THREE.Points;
  private groundSnow!: THREE.Points; 
  private groundMist!: THREE.Points; 
  public photoFrames: THREE.Group[] = [];
  private starMesh!: THREE.Mesh;
  private starHalo!: THREE.Group;
  private groundGlow!: THREE.Mesh;
  private glimmerParticles: THREE.Mesh[] = [];

  private lastMode: AppMode | null = null;
  private burstFactor: number = 0;

  private snowflakeTexture: THREE.Texture;
  private mistTexture: THREE.Texture; 

  constructor() {
    this.group = new THREE.Group();
    this.snowflakeTexture = this.createSnowflakeTexture();
    this.mistTexture = this.createMistTexture();

    this.initSnow();
    this.initDust();
    this.initMainParticles();
    this.initBaseFiller();
    this.initCandyCanes();
    this.initDefaultPhotos(); 
    this.initStar();
    this.initGlimmer();
    this.initGroundGlow();
    this.initGroundSnow();
    this.initGroundMist();
  }

  private createSnowflakeTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = 'white'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.translate(64, 64);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(15, -35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(-15, -35); ctx.stroke();
      ctx.rotate(Math.PI / 3);
    }
    return new THREE.CanvasTexture(canvas);
  }

  private createMistTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(0.3, 'rgba(200, 210, 255, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }

  private create3DSnowflakeGeometry(): THREE.BufferGeometry {
    const plane1 = new THREE.PlaneGeometry(0.4, 0.4);
    const plane2 = plane1.clone();
    plane2.rotateY(Math.PI / 2);
    return BufferGeometryUtils.mergeGeometries([plane1, plane2]);
  }

  private initBaseFiller() {
    const count = 1500; 
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.pow(Math.random(), 0.8) * 15;
      const angle = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.random() * 3 - 17.0; 
      pos[i * 3 + 2] = Math.sin(angle) * r;
      colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.7; colors[i * 3 + 2] = 0.5;
      seeds[i] = Math.random() * 1000;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.baseFiller = new THREE.Points(geo, mat);
    this.group.add(this.baseFiller);
  }

  private initSnow() {
    const geo = new THREE.BufferGeometry();
    const count = 2500;
    const pos = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = Math.random() * 150 - 75;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 150;
      velocities[i] = 0.04 + Math.random() * 0.08;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.0, map: this.snowflakeTexture, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, alphaTest: 0.01 });
    this.snow = new THREE.Points(geo, mat);
    this.group.add(this.snow);
  }

  private initDust() {
    const count = 1200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ 
      color: 0xffeeaa, 
      size: 0.2, 
      transparent: true, 
      opacity: 0.4, 
      blending: THREE.AdditiveBlending, 
      depthWrite: false 
    });
    this.dust = new THREE.Points(geo, mat);
    this.group.add(this.dust);
  }

  private initGroundSnow() {
    const count = 4000; 
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.pow(Math.random(), 0.5) * 40;
      const angle = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = -16.9; 
      pos[i * 3 + 2] = Math.sin(angle) * r;
      seeds[i] = Math.random() * 2000;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.PointsMaterial({ size: 0.12, map: this.snowflakeTexture, transparent: true, opacity: 0, color: 0xccccff, blending: THREE.AdditiveBlending, depthWrite: false });
    this.groundSnow = new THREE.Points(geo, mat);
    this.group.add(this.groundSnow);
  }

  private initGroundMist() {
    const count = 220; 
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const isInner = Math.random() > 0.7;
      const r = isInner ? 6 + Math.random() * 8 : 12 + Math.random() * 32; 
      const angle = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = -16.2;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      if (isInner) { colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.5; colors[i * 3 + 2] = 0.4; }
      else { colors[i * 3] = 0.3; colors[i * 3 + 1] = 0.4; colors[i * 3 + 2] = 0.6; }
      seeds[i] = Math.random() * 1000;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.PointsMaterial({ size: 20, map: this.mistTexture, transparent: true, opacity: 0, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.groundMist = new THREE.Points(geo, mat);
    this.group.add(this.groundMist);
  }

  private initGroundGlow() {
    const geo = new THREE.CircleGeometry(40, 64);
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128,128,0, 128,128,128);
    grad.addColorStop(0, 'rgba(212, 175, 55, 0.05)'); 
    grad.addColorStop(0.7, 'rgba(100, 100, 255, 0.01)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,256,256);
    const tex = new THREE.CanvasTexture(canvas);
    this.groundGlow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.groundGlow.rotation.x = -Math.PI / 2; this.groundGlow.position.y = -16.95;
    this.group.add(this.groundGlow);
  }

  private initStar() {
    const shape = new THREE.Shape();
    const points = 5; const innerRadius = 0.3; const outerRadius = 0.8;
    // 使用曲线创建更圆润的星星形状
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * Math.PI / points;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        // 使用二次贝塞尔曲线让菱角更圆润
        const prevAngle = (i - 1) * Math.PI / points;
        const prevR = (i - 1) % 2 === 0 ? outerRadius : innerRadius;
        const prevX = Math.cos(prevAngle) * prevR;
        const prevY = Math.sin(prevAngle) * prevR;
        const midAngle = (prevAngle + angle) / 2;
        const midR = (prevR + r) * 0.5;
        const midX = Math.cos(midAngle) * midR * 0.9; // 0.9 让曲线更平滑
        const midY = Math.sin(midAngle) * midR * 0.9;
        shape.quadraticCurveTo(midX, midY, x, y);
      }
    }
    shape.closePath();
    // 增加 bevelSegments 让边缘更圆润
    const starGeo = new THREE.ExtrudeGeometry(shape, { 
      depth: 0.1, 
      bevelEnabled: true, 
      bevelThickness: 0.08, 
      bevelSize: 0.08, 
      bevelSegments: 8, // 增加分段数，让边缘更圆润
      curveSegments: 16 // 增加曲线分段数
    });
    // 增强星星的发光效果
    this.starMesh = new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({ 
      color: 0xffd700, 
      emissive: 0xffaa00, 
      emissiveIntensity: 0.5, // 进一步增强发光强度
      metalness: 0.1, 
      roughness: 1 
    }));
    this.group.add(this.starMesh);

    // 创建多层光晕效果
    this.starHalo = new THREE.Group();
    
    // 内层光晕（更亮，更小）
    const innerCanvas = document.createElement('canvas'); 
    innerCanvas.width = 256; innerCanvas.height = 256;
    const innerCtx = innerCanvas.getContext('2d')!;
    const innerGrad = innerCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    innerGrad.addColorStop(0, 'rgba(255, 240, 180, 0.7)'); 
    innerGrad.addColorStop(0.4, 'rgba(255, 200, 100, 0.3)'); 
    innerGrad.addColorStop(0.7, 'rgba(255, 150, 50, 0.1)'); 
    innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    innerCtx.fillStyle = innerGrad; 
    innerCtx.fillRect(0, 0, 256, 256);
    const innerGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 3.5), 
      new THREE.MeshBasicMaterial({ 
        map: new THREE.CanvasTexture(innerCanvas), 
        transparent: true, 
        blending: THREE.AdditiveBlending, 
        depthWrite: false, 
        opacity: 0.8
      })
    );
    innerGlow.position.z = -0.2; 
    this.starHalo.add(innerGlow);
    
    // 外层光晕（更大，更柔和）
    const outerCanvas = document.createElement('canvas'); 
    outerCanvas.width = 256; outerCanvas.height = 256;
    const outerCtx = outerCanvas.getContext('2d')!;
    const outerGrad = outerCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    outerGrad.addColorStop(0, 'rgba(255, 230, 150, 0.4)'); 
    outerGrad.addColorStop(0.5, 'rgba(255, 180, 80, 0.15)'); 
    outerGrad.addColorStop(0.8, 'rgba(255, 150, 50, 0.06)'); 
    outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    outerCtx.fillStyle = outerGrad; 
    outerCtx.fillRect(0, 0, 256, 256);
    const outerGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 5.5), 
      new THREE.MeshBasicMaterial({ 
        map: new THREE.CanvasTexture(outerCanvas), 
        transparent: true, 
        blending: THREE.AdditiveBlending, 
        depthWrite: false, 
        opacity: 0.6
      })
    );
    outerGlow.position.z = -0.3; 
    this.starHalo.add(outerGlow);
    
    this.group.add(this.starHalo);
  }

  private initGlimmer() {
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfceea7, emissiveIntensity: 1.0, transparent: true, opacity: 0.4 });
    for (let i = 0; i < 80; i++) {
      const mesh = new THREE.Mesh(geo, mat); mesh.userData.seed = Math.random() * 100;
      this.glimmerParticles.push(mesh); this.group.add(mesh);
    }
  }

  private initMainParticles() {
    const count = 1800; const snowflakeGeo = this.create3DSnowflakeGeometry(); const sphereGeo = new THREE.SphereGeometry(0.15, 8, 8);
    for (let i = 0; i < count; i++) {
      let geo = Math.random() > 0.6 ? sphereGeo : snowflakeGeo;
      const matRand = Math.random(); let mat: THREE.Material;
      const props = { map: geo === snowflakeGeo ? this.snowflakeTexture : null, transparent: geo === snowflakeGeo, alphaTest: 0.1 };
      if (matRand > 0.7) mat = new THREE.MeshStandardMaterial({ color: 0xaa8822, emissive: 0xffcc33, emissiveIntensity: 0.8, ...props });
      else if (matRand > 0.3) mat = new THREE.MeshStandardMaterial({ color: 0x012210, emissive: 0x00ff44, emissiveIntensity: 1.2, ...props });
      else mat = new THREE.MeshPhysicalMaterial({ color: 0x880000, emissive: 0xff2233, emissiveIntensity: 1.2, clearcoat: 1.0, ...props });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { rotVel: new THREE.Vector3(Math.random()*0.05, Math.random()*0.05, Math.random()*0.05), noiseSeed: Math.random()*1000, baseEmissive: 1.0 };
      this.mainParticles.push(mesh); this.group.add(mesh);
    }
  }

  private initCandyCanes() {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,128,128);
    ctx.strokeStyle = '#dd0000'; ctx.lineWidth = 15;
    for(let i=-128; i<256; i+=30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke(); }
    const tex = new THREE.CanvasTexture(canvas); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 1);
    const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0.3,0), new THREE.Vector3(0.1,0.45,0), new THREE.Vector3(0.2,0.4,0)]), 10, 0.03, 6, false);
    for(let i=0; i<80; i++) {
      const mesh = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
      mesh.userData = { rotVel: new THREE.Vector3(Math.random()*0.04, Math.random()*0.04, Math.random()*0.04), noiseSeed: Math.random()*1000, baseEmissive: 0.6 };
      this.candyCanes.push(mesh); this.group.add(mesh);
    }
  }

  private createTextCardTexture(title: string, content: string, footer: string): THREE.Texture {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#000000'; ctx.fillRect(0,0,1024,1024);
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 20; ctx.strokeRect(60, 60, 904, 904);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#d4af37';
    ctx.font = '84px serif'; ctx.fillText(title, 512, 320);
    ctx.font = '84px serif'; ctx.fillText(content, 512, 480);
    ctx.font = '72px serif'; ctx.fillText(footer, 512, 640);
    return new THREE.CanvasTexture(canvas);
  }

  private initDefaultPhotos() {
    // 创建文字贺卡
    this.addPhotoToScene(this.createTextCardTexture("愿今年，胜旧年！", "圣诞快乐噢卓琳！", "--天天"));
  }

  public addPhotoToScene(texture: THREE.Texture) {
    const group = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.1), new THREE.MeshStandardMaterial({ 
      color: 0xd4af37, metalness: 1, roughness: 0.1, emissive: 0xd4af37, emissiveIntensity: 0 
    }));
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial({ map: texture }));
    photo.position.z = 0.06; group.add(frame, photo);
    this.photoFrames.push(group); this.group.add(group);
  }

  public getPhotoWorldPositions(): {index: number, position: THREE.Vector3}[] {
    return this.photoFrames.map((f, i) => {
      const v = new THREE.Vector3();
      f.getWorldPosition(v);
      return { index: i, position: v };
    });
  }

  public update(mode: AppMode, focusTarget: number) {
    const time = performance.now() * 0.001;
    if (this.lastMode !== mode) { this.lastMode = mode; this.burstFactor = 1.0; }
    this.burstFactor *= 0.94;

    const snowPos = this.snow.geometry.attributes.position.array as Float32Array;
    const snowVels = this.snow.geometry.attributes.velocity.array as Float32Array;
    for (let i = 0; i < snowPos.length / 3; i++) {
      snowPos[i * 3 + 1] -= snowVels[i]; snowPos[i * 3] += Math.sin(time * 0.4 + i) * 0.01;
      if (snowPos[i * 3 + 1] < -75) snowPos[i * 3 + 1] = 75;
    }
    this.snow.geometry.attributes.position.needsUpdate = true;

    const dustPos = this.dust.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < dustPos.length / 3; i++) {
      dustPos[i * 3 + 1] -= 0.05; if (dustPos[i * 3 + 1] < -50) dustPos[i * 3 + 1] = 50;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;

    const updatePart = (list: THREE.Mesh[]) => {
      list.forEach((p, i) => {
        let targetPos = new THREE.Vector3(); let targetScale = new THREE.Vector3(1,1,1);
        const t = i / list.length; const seed = p.userData.noiseSeed;
        const twinkle = 0.5 + Math.sin(time * 2.0 + seed) * 0.5;
        // 增强所有粒子的发光效果
        if (p.material instanceof THREE.MeshStandardMaterial) {
          const baseIntensity = p.userData.baseEmissive || 1.0; // 如果没有 baseEmissive，使用默认值
          p.material.emissiveIntensity = baseIntensity * (1.0 + twinkle * 0.5); // 从 0.8-1.2 提升到 1.0-1.5
        } else if (p.material instanceof THREE.MeshPhysicalMaterial) {
          const baseIntensity = p.userData.baseEmissive || 1.0;
          p.material.emissiveIntensity = baseIntensity * (1.0 + twinkle * 0.5); // 同样增强物理材质
        }
        
        if (mode === AppMode.TREE) {
          const height = 32; const maxRadius = 14; const t_y = Math.pow(t, 1.4);
          // 让顶部更尖：最小半径随高度变化，顶部允许更小的半径
          // t 接近 1（顶部）时，minRadius 接近 0，让顶部更尖
          // t 接近 0（底部）时，minRadius 更大，避免中心聚集
          const minRadius = Math.max(0, 2.0 * (1 - t)); // 顶部为 0，底部为 2.0
          const baseRadius = maxRadius * (1 - t); // 基础半径，从底部到顶部线性减小
          const radius = Math.max(minRadius, baseRadius + Math.sin(seed * 0.5 + time * 0.3) * 0.8);
          const angle = t * 65 * Math.PI + Math.cos(seed * 0.4) * 0.8;
          targetPos.set(radius * Math.cos(angle), t_y * height - 16, radius * Math.sin(angle));
        } else if (mode === AppMode.SCATTER) {
          const angle = t * Math.PI * 2 + time * 0.1;
          const r = 20 + Math.sin(seed) * 4; 
          const h = (t - 0.5) * 65; 
          targetPos.set(r * Math.cos(angle), h, r * Math.sin(angle));
        } else if (mode === AppMode.FOCUS) {
          const angle = t * Math.PI * 2; 
          const r = 45 + Math.random() * 20;
          targetPos.set(Math.cos(angle) * r, Math.sin(angle) * r, -50);
          targetScale.setScalar(0.4);
        }
        p.position.lerp(targetPos.add(new THREE.Vector3().copy(p.position).normalize().multiplyScalar(this.burstFactor * 3.5)), 0.04);
        p.scale.lerp(targetScale, 0.06);
        p.rotation.x += p.userData.rotVel.x; p.rotation.y += p.userData.rotVel.y;
      });
    };
    updatePart(this.mainParticles); updatePart(this.candyCanes);

    this.photoFrames.forEach((frame, i) => {
      let targetPos = new THREE.Vector3(); let targetScale = new THREE.Vector3(1,1,1); let targetRot = new THREE.Euler(0,0,0);
      const frameMat = (frame.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const idx = focusTarget % this.photoFrames.length;

      if (mode === AppMode.TREE) {
        const height = 28; const maxRadius = 14; const t = (i + 0.5) / (this.photoFrames.length + 1); 
        const radius = (maxRadius * (1 - t)) + Math.sin(i * 12) * 1.5; const angle = t * 55 * Math.PI + (i * 15);
        targetPos.set(radius * Math.cos(angle), Math.pow(t, 1.4) * height - 14, radius * Math.sin(angle));
        targetScale.setScalar(0.65); 
        targetRot.set(time * 0.3 + i, time * 0.5 + i, time * 0.2);
        frameMat.emissiveIntensity = 0.8 + Math.sin(time * 2 + i) * 0.4;
        frameMat.emissive.setHex(0xccffff); 
      } else if (mode === AppMode.SCATTER) {
        const count = this.photoFrames.length;
        const radius = 32; 
        const layerSize = 15;
        const layerIdx = Math.floor(i / layerSize);
        const itemIdxInLayer = i % layerSize;
        const totalInCurrentLayer = Math.min(layerSize, count - layerIdx * layerSize);
        const rotationOffset = time * 0.7;
        const angle = (itemIdxInLayer / totalInCurrentLayer) * Math.PI * 2 + rotationOffset;
        const h = (layerIdx - (Math.ceil(count / layerSize) - 1) / 2) * 18; 
        
        targetPos.set(radius * Math.cos(angle), h, radius * Math.sin(angle));
        targetScale.setScalar(2.2); 
        
        const lookDir = new THREE.Vector3().copy(targetPos).add(new THREE.Vector3(targetPos.x, 0, targetPos.z).normalize().multiplyScalar(10));
        frame.lookAt(lookDir); 
        targetRot.copy(frame.rotation);

        frameMat.emissiveIntensity = 1.0 + Math.sin(time * 4 + i) * 0.5;
        frameMat.emissive.setHex(0xd4af37); 
      } else if (mode === AppMode.FOCUS) {
        if (i === idx) {
          targetPos.set(0, 0, 36); targetScale.setScalar(11.0); 
          targetRot.y = Math.sin(time * 0.5) * 0.15; 
          frameMat.emissiveIntensity = 0.1;
        } else {
          const angle = (i - idx) * 0.8; 
          targetPos.set(Math.cos(angle) * 80, 45, -80);
          targetScale.setScalar(0.1); 
          frameMat.emissiveIntensity = 0;
        }
      }
      frame.position.lerp(targetPos, 0.05); 
      frame.scale.lerp(targetScale, 0.05);
      frame.rotation.set(
        THREE.MathUtils.lerp(frame.rotation.x, targetRot.x, 0.05), 
        THREE.MathUtils.lerp(frame.rotation.y, targetRot.y, 0.05), 
        THREE.MathUtils.lerp(frame.rotation.z, targetRot.z, 0.05)
      );
    });

    const groundMat = this.groundSnow.material as THREE.PointsMaterial;
    const mistMat = this.groundMist.material as THREE.PointsMaterial;
    const fMat = this.baseFiller.material as THREE.PointsMaterial;
    const mPos = this.groundMist.geometry.attributes.position.array as Float32Array;
    const mSeeds = this.groundMist.geometry.attributes.seed.array as Float32Array;
    const fPos = this.baseFiller.geometry.attributes.position.array as Float32Array;
    const fSeeds = this.baseFiller.geometry.attributes.seed.array as Float32Array;

    if (mode === AppMode.TREE) {
      groundMat.opacity = THREE.MathUtils.lerp(groundMat.opacity, 0.15, 0.02);
      mistMat.opacity = THREE.MathUtils.lerp(mistMat.opacity, 0.12, 0.02);
      fMat.opacity = THREE.MathUtils.lerp(fMat.opacity, 0.04, 0.02);
      for (let i = 0; i < mPos.length / 3; i++) {
        const seed = mSeeds[i]; const r = 8 + (seed % 34); const speed = 0.025 + (seed % 0.045);
        const curAng = time * speed + seed; mPos[i * 3] = Math.cos(curAng) * r; mPos[i * 3 + 2] = Math.sin(curAng) * r;
        mPos[i * 3 + 1] = -15.8 + Math.sin(time * 0.25 + seed) * 1.8;
      }
      this.groundMist.geometry.attributes.position.needsUpdate = true;
      for (let i = 0; i < fPos.length / 3; i++) {
        const s = fSeeds[i]; const drift = time * 0.1 + s; const r = 5 + (s % 12); 
        fPos[i * 3] = Math.cos(drift) * r; fPos[i * 3 + 1] = THREE.MathUtils.lerp(fPos[i * 3 + 1], -16.9 + (s % 2.5), 0.04); fPos[i * 3 + 2] = Math.sin(drift) * r;
      }
      this.baseFiller.geometry.attributes.position.needsUpdate = true;
    } else {
      groundMat.opacity = THREE.MathUtils.lerp(groundMat.opacity, 0, 0.1);
      mistMat.opacity = THREE.MathUtils.lerp(mistMat.opacity, 0, 0.1);
      fMat.opacity = THREE.MathUtils.lerp(fMat.opacity, 0, 0.1);
    }

    this.starMesh.position.lerp(mode === AppMode.TREE ? new THREE.Vector3(0, 20, 0) : new THREE.Vector3(0, 40, -50), 0.05);
    this.starMesh.scale.lerp(mode === AppMode.TREE ? new THREE.Vector3(2,2,2) : new THREE.Vector3(0.1,0.1,0.1), 0.05);
    
    // 在圣诞树模式下，星星慢慢自转并增强发光效果
    if (mode === AppMode.TREE) {
      this.starMesh.rotation.y += 0.005; // 慢慢自转（每帧旋转 0.005 弧度）
      this.starMesh.rotation.z += 0.002; // 轻微倾斜旋转，更有动感
      
      // 让发光效果有轻微的闪烁（呼吸效果）
      const starMat = this.starMesh.material as THREE.MeshStandardMaterial;
      const glowIntensity = 0.7 + Math.sin(time * 1.5) * 0.15; // 在 0.55-0.85 之间变化
      starMat.emissiveIntensity = glowIntensity;
      
      // 光晕也跟随旋转
      this.starHalo.rotation.z = this.starMesh.rotation.z * 0.5; // 光晕旋转速度是星星的一半
    } else {
      // 非圣诞树模式下，恢复默认发光强度
      const starMat = this.starMesh.material as THREE.MeshStandardMaterial;
      starMat.emissiveIntensity = 0.15;
    }
    
    this.starHalo.visible = mode === AppMode.TREE;
    this.groundGlow.visible = mode === AppMode.TREE;
  }
}
