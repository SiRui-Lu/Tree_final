
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { AppMode, HandLandmarkerResult } from './types';
import { Loader } from './components/Loader';
import { HandTracker } from './services/HandTracker';
import { ParticleSystem } from './services/ParticleSystem';

// 更新为本地音频文件路径（放在 public 目录下）
const CHRISTMAS_AUDIO_URL = '/christmas_list.aac';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [gestureInfo, setGestureInfo] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastHandDetectedRef = useRef(false);
  const lastGestureInfoRef = useRef('');
  const lastStateUpdateTime = useRef(0);
  
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    particles: ParticleSystem;
    mainGroup: THREE.Group;
    starLight: THREE.PointLight;
    groundBounceLight: THREE.PointLight; 
    handTracker: HandTracker;
    mode: AppMode;
    focusTarget: number;
    lastGestureTime: number;
    lastPalmX: number;
    isGrabbing: boolean;
    pinchReleaseCount: number; // 用于延迟释放，需要连续几帧超过阈值才释放
  } | null>(null);

  const renderIntroSnow = () => {
    return Array.from({ length: 15 }).map((_, i) => {
      const style = {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 10}s, ${Math.random() * 3}s`,
        animationDuration: `${10 + Math.random() * 10}s, ${2 + Math.random() * 2}s`,
        fontSize: `${0.5 + Math.random() * 1.5}rem`
      };
      return <div key={i} className="intro-snowflake" style={style}>❅</div>;
    });
  };

  const startApp = () => {
    setHasStarted(true);
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('音频播放成功');
            setAudioError(false);
          })
          .catch((error) => {
            console.error('音频播放失败:', error);
            setAudioError(true);
            // 浏览器需要用户交互才能播放音频
            const runAudio = () => {
              audioRef.current?.play().catch((err) => {
                console.error('用户交互后仍无法播放:', err);
              });
              window.removeEventListener('click', runAudio);
            };
            window.addEventListener('click', runAudio);
          });
      }
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || !sceneRef.current) return;
    const renderer = sceneRef.current.renderer;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        new THREE.TextureLoader().load(ev.target?.result as string, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = maxAnisotropy;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.generateMipmaps = true;
          sceneRef.current?.particles.addPhotoToScene(t);
          sceneRef.current!.mode = AppMode.FOCUS;
          sceneRef.current!.focusTarget = sceneRef.current!.particles.photoFrames.length - 1;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (!containerRef.current || !hasStarted) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    // 移动设备上使用更宽松的捏合阈值和释放延迟
    const PINCH_THRESHOLD = isMobile ? 0.12 : 0.08; // 移动设备阈值更大
    const PINCH_RELEASE_DELAY = isMobile ? 10 : 5; // 移动设备需要更多帧才释放
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    containerRef.current.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 
      0.2, 
      isMobile ? 0.3 : 0.4, 
      0.5
    );
    composer.addPass(bloomPass);

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const starLight = new THREE.PointLight(0xfff9e6, 0, 60);
    const groundBounceLight = new THREE.PointLight(0xccccff, 0, 40);
    scene.add(starLight, groundBounceLight);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    const particles = new ParticleSystem();
    mainGroup.add(particles.group);

    const handTracker = new HandTracker();
    sceneRef.current = {
      scene, camera, renderer, composer, particles, mainGroup, starLight, groundBounceLight, handTracker,
      mode: AppMode.TREE, focusTarget: 0, lastGestureTime: 0, lastPalmX: 0.5, isGrabbing: false, pinchReleaseCount: 0
    };

    // 优化：减少重复计算，直接遍历而不是先过滤
    const findNearestPhotoIndex = (handX: number, handY: number) => {
      const { camera, particles } = sceneRef.current!;
      const framesData = particles.getPhotoWorldPositions();
      if (framesData.length === 0) return -1;

      let bestIdx = -1;
      let minScore = Infinity;
      const cameraPos = camera.position;

      // 优化：减少数组操作，直接遍历并计算
      for (let i = 0; i < framesData.length; i++) {
        const item = framesData[i];
        const screenPos = item.position.clone().project(camera);
        const sx = (screenPos.x + 1) / 2;
        const sy = (1 - screenPos.y) / 2;
        
        // 快速筛选：只处理在可见区域的照片
        if (sx > 0.2 && sx < 0.8 && sy > 0.35 && sy < 0.65) {
          const distToCamera = item.position.distanceTo(cameraPos);
          const distToHand = Math.hypot(sx - handX, sy - handY);
          const score = (distToCamera * 3.0) + (distToHand * 50.0);
          
          if (score < minScore) {
            minScore = score;
            bestIdx = item.index;
          }
        }
      }

      return bestIdx;
    };

    const animate = () => {
      if (!sceneRef.current) return;
      const { composer, particles, mainGroup, starLight, groundBounceLight, handTracker, camera } = sceneRef.current;
      const now = performance.now();
      const time = now * 0.001;

      // 如果手势追踪未初始化，跳过检测（避免错误）
      if (!handTracker || !sceneRef.current?.handTracker) {
        requestAnimationFrame(animate);
        return;
      }
      
      handTracker.detect((results: HandLandmarkerResult) => {
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          if (!landmarks || landmarks.length < 21) {
            if (lastHandDetectedRef.current) {
              lastHandDetectedRef.current = false;
              // 节流状态更新：每200ms最多更新一次
              if (now - lastStateUpdateTime.current > 200) {
                setHandDetected(false);
                lastStateUpdateTime.current = now;
              }
            }
            return;
          }
          
          // 只在状态改变时更新 React state（减少重新渲染）
          if (!lastHandDetectedRef.current && now - lastStateUpdateTime.current > 200) {
            setHandDetected(true);
            lastHandDetectedRef.current = true;
            lastStateUpdateTime.current = now;
          }
          
          const palm = landmarks[9];
          // 使用更平滑的插值
          mainGroup.rotation.y = THREE.MathUtils.lerp(mainGroup.rotation.y, (palm.x - 0.5) * 0.8, 0.08);
          mainGroup.rotation.x = THREE.MathUtils.lerp(mainGroup.rotation.x, (palm.y - 0.5) * 0.4, 0.08);

          const wrist = landmarks[0], thumbTip = landmarks[4], indexTip = landmarks[8];
          const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
          
          // 检测捏合手势（移动设备使用更宽松的阈值）
          if (pinchDist < PINCH_THRESHOLD) {
            // 重置释放计数器
            sceneRef.current!.pinchReleaseCount = 0;
            
            if (!sceneRef.current!.isGrabbing && now - sceneRef.current!.lastGestureTime > 400) {
              const nearestIdx = findNearestPhotoIndex(palm.x, palm.y);
              if (nearestIdx !== -1) {
                sceneRef.current!.focusTarget = nearestIdx;
                sceneRef.current!.mode = AppMode.FOCUS;
                sceneRef.current!.isGrabbing = true;
                sceneRef.current!.lastGestureTime = now;
                sceneRef.current!.pinchReleaseCount = 0; // 重置计数器
                if (lastGestureInfoRef.current !== '🤏 聚焦照片') {
                  setGestureInfo('🤏 聚焦照片');
                  lastGestureInfoRef.current = '🤏 聚焦照片';
                }
              }
            }
          } else {
            // 超过阈值，增加释放计数器
            if (sceneRef.current!.isGrabbing) {
              sceneRef.current!.pinchReleaseCount++;
              // 需要连续多帧都超过阈值才释放（避免抖动导致误释放）
              if (sceneRef.current!.pinchReleaseCount >= PINCH_RELEASE_DELAY) {
                sceneRef.current!.isGrabbing = false;
                sceneRef.current!.pinchReleaseCount = 0;
              }
            }
          }

          // 手势检测（降低阈值，更容易识别）
          if (now - sceneRef.current!.lastGestureTime > 500) {
            const middleTip = landmarks[12], ringTip = landmarks[16];
            // 缓存计算结果
            const indexDist = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
            const middleDist = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
            const ringDist = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
            
            const indexExtended = indexDist > 0.28;
            const middleExtended = middleDist > 0.28;
            const isPeaceSign = indexExtended && middleExtended && ringDist < 0.32;
            const isOpenHand = (indexDist + middleDist) / 2 > 0.38;

            if (isPeaceSign) {
              sceneRef.current!.mode = AppMode.TREE;
              sceneRef.current!.lastGestureTime = now;
              if (lastGestureInfoRef.current !== '✌️ 圣诞树模式') {
                setGestureInfo('✌️ 圣诞树模式');
                lastGestureInfoRef.current = '✌️ 圣诞树模式';
              }
            } else if (isOpenHand && sceneRef.current!.mode !== AppMode.SCATTER) {
              sceneRef.current!.mode = AppMode.SCATTER;
              sceneRef.current!.lastGestureTime = now;
              if (lastGestureInfoRef.current !== '🖐️ 画廊模式') {
                setGestureInfo('🖐️ 画廊模式');
                lastGestureInfoRef.current = '🖐️ 画廊模式';
              }
            }
          }

          if (sceneRef.current?.mode === AppMode.FOCUS && !sceneRef.current.isGrabbing && now - sceneRef.current.lastGestureTime > 600) {
            const deltaX = palm.x - sceneRef.current.lastPalmX;
            if (Math.abs(deltaX) > 0.15) {
              const photoCount = sceneRef.current.particles.photoFrames.length;
              if (photoCount > 0) {
                sceneRef.current.focusTarget = (sceneRef.current.focusTarget + (deltaX > 0 ? -1 : 1) + photoCount) % photoCount;
              }
              sceneRef.current.lastGestureTime = now;
            }
          }
          sceneRef.current!.lastPalmX = palm.x;
        } else {
          if (lastHandDetectedRef.current && now - lastStateUpdateTime.current > 200) {
            setHandDetected(false);
            lastHandDetectedRef.current = false;
            lastStateUpdateTime.current = now;
            if (lastGestureInfoRef.current) {
              lastGestureInfoRef.current = '';
              setTimeout(() => setGestureInfo(''), 2000);
            }
          }
        }
      });

      if (sceneRef.current!.mode === AppMode.TREE) {
        starLight.intensity = 15 + Math.sin(time * 2) * 5; 
        starLight.position.set(0, 20, 5);
        groundBounceLight.intensity = 1.5 + Math.sin(time * 2) * 0.5; 
        groundBounceLight.position.set(0, -18, 12);
        camera.position.lerp(new THREE.Vector3(0, 2, 50), 0.05);
      } else if (sceneRef.current!.mode === AppMode.SCATTER) {
        starLight.intensity = 2; starLight.position.set(0, 30, -20);
        groundBounceLight.intensity = 0; 
        camera.position.lerp(new THREE.Vector3(0, 0, 85), 0.05);
      } else {
        starLight.intensity = 1; groundBounceLight.intensity = 0; 
        camera.position.lerp(new THREE.Vector3(0, 0, 90), 0.05);
      }

      particles.update(sceneRef.current!.mode, sceneRef.current!.focusTarget);
      composer.render();
      requestAnimationFrame(animate);
    };

    // 添加超时机制，避免在移动设备上无限等待
    const initTimeout = setTimeout(() => {
      console.warn('手势追踪初始化超时，继续运行应用');
      setCameraError('手势追踪初始化超时，应用将继续运行（手势功能可能不可用）');
      setLoading(false);
      animate();
    }, 15000); // 15秒超时

    handTracker.init()
      .then(() => { 
        clearTimeout(initTimeout);
        console.log('手势追踪初始化成功');
        setCameraError('');
        setLoading(false); 
        animate(); 
      })
      .catch((error: any) => { 
        clearTimeout(initTimeout);
        console.error('手势追踪初始化失败:', error);
        let errorMessage = '摄像头初始化失败';
        if (error.name === 'NotReadableError' || error.message?.includes('Device in use')) {
          errorMessage = '摄像头被其他应用占用，应用将继续运行（手势功能不可用）';
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = '摄像头权限被拒绝，应用将继续运行（手势功能不可用）';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = '未检测到摄像头设备，应用将继续运行（手势功能不可用）';
        } else {
          errorMessage = '手势追踪初始化失败，应用将继续运行（手势功能可能不可用）';
        }
        setCameraError(errorMessage);
        setLoading(false); 
        animate(); 
      });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); renderer.dispose(); };
  }, [hasStarted]);

  return (
    <div ref={containerRef} className="w-full h-screen bg-black relative touch-none overflow-hidden select-none">
      <audio 
        ref={audioRef} 
        loop 
        preload="auto"
        playsInline
        src={CHRISTMAS_AUDIO_URL} 
        onError={(e) => {
          console.error('音频加载错误:', e);
          setAudioError(true);
        }}
        onLoadedData={() => {
          console.log('音频加载成功');
          setAudioError(false);
        }}
        onCanPlay={() => {
          console.log('音频可以播放');
        }}
      />

      {!hasStarted && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden">
          <div className="absolute inset-0 z-0">{renderIntroSnow()}</div>
          <div className="text-center mb-8 px-6 z-10 relative">
            <h2 className="great-vibes text-[#d4af37] text-6xl mb-6 drop-shadow-lg">Merry Christmas</h2>
            <p className="cinzel text-white/60 text-xs tracking-widest leading-relaxed">May you become your own sun, without borrowing anyone's light </p>
          </div>
          <button 
            onClick={startApp}
            className="flex items-center justify-center bg-[#d4af37] text-black w-20 h-20 rounded-full text-4xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_40px_rgba(212,175,55,0.6)] z-10 relative"
          >
            😊
          </button>
        </div>
      )}

      {hasStarted && <Loader isLoading={loading} />}
      
      {/* 摄像头错误提示 */}
      {hasStarted && !loading && cameraError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="px-4 py-3 rounded-lg bg-red-500/90 backdrop-blur-sm border border-red-400 shadow-lg max-w-md">
            <p className="text-white text-sm font-bold text-center mb-2">{cameraError}</p>
            <button
              onClick={() => {
                setCameraError('');
                window.location.reload();
              }}
              className="w-full px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded transition-all"
            >
              刷新页面重试
            </button>
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 pointer-events-none z-30" style={{ background: 'radial-gradient(circle, rgba(0,0,0,0) 20%, rgba(0,0,0,0.95) 100%)' }}></div>
      <div className="absolute top-10 left-0 w-full flex flex-col items-center z-20 px-4 pointer-events-none">
        <h1 className="cinzel text-4xl sm:text-5xl md:text-[64px] font-bold text-center leading-tight tracking-widest" 
            style={{ background: 'linear-gradient(to bottom, #ffffff 20%, #d4af37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.3))' }}>
          Merry Christmas
        </h1>
      </div>


      <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 w-fit flex flex-col items-center gap-8 z-40 transition-all duration-700 ${!hasStarted || loading ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
        <div className="flex items-center justify-center relative">
          <label className="cursor-pointer active:scale-90 transition-all bg-[#d4af37] text-black w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.6)] hover:bg-[#fceea7] border border-white/20" title="Add Memory">
            <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} accept="image/*" />
            <span className="text-4xl font-light mb-1">+</span>
          </label>
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-black ${audioError ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <p className="text-[#fceea7]/60 text-[8px] sm:text-[10px] tracking-[0.3em] uppercase cinzel font-bold text-center drop-shadow-lg">
            Peace ✌️: Tree | Open 🖐️: Gallery | Pinch 🤏: Focus Photo
          </p>
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

export default App;
