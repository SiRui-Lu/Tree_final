
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandLandmarkerResult } from '../types';

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;

  async init() {
    // 检测是否为移动设备
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      // 移动设备直接使用 CPU，避免 GPU 初始化问题
      const delegate = isMobile ? "CPU" : "GPU";
      
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: delegate
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3, 
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3
        });
      } catch (error) {
        if (!isMobile) {
          // 非移动设备才尝试回退到 CPU
          console.warn('GPU delegate failed, falling back to CPU:', error);
          this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
              delegate: "CPU"
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.3, 
            minHandPresenceConfidence: 0.3,
            minTrackingConfidence: 0.3
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('MediaPipe initialization failed:', error);
      throw error;
    }

    this.video = document.createElement('video');
    this.video.style.position = 'absolute';
    this.video.style.opacity = '0';
    this.video.style.pointerEvents = 'none';
    this.video.style.width = '1px';
    this.video.style.height = '1px';
    
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    this.video.muted = true;
    
    document.body.appendChild(this.video);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        } 
      });
      
      this.video.srcObject = stream;
      await this.video.play();
      console.log('摄像头访问成功');
    } catch (error: any) {
      console.error('Failed to access camera:', error);
      // 清理已创建的元素
      if (this.video && this.video.srcObject) {
        const stream = this.video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        this.video.srcObject = null;
      }
      if (this.video && this.video.parentNode) {
        this.video.parentNode.removeChild(this.video);
      }
      throw error;
    }
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  detect(callback: (results: HandLandmarkerResult) => void) {
    if (!this.handLandmarker) {
      console.warn('HandLandmarker not initialized');
      return;
    }
    if (!this.video) {
      console.warn('Video element not available');
      return;
    }
    if (this.video.readyState !== 4) {
      // 视频未准备好，静默返回（避免日志过多）
      return;
    }

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      try {
        const results = this.handLandmarker.detectForVideo(this.video, performance.now());
        callback(results);
      } catch (error) {
        console.error('Hand detection error:', error);
      }
    }
  }
}
