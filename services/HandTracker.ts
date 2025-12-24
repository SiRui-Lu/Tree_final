
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandLandmarkerResult } from '../types';

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    // 尝试使用 GPU，如果失败则回退到 CPU
    try {
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.3, 
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3
      });
    } catch (error) {
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
