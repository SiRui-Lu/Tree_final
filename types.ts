export type WidgetType = 'note' | 'todo' | 'stats' | 'chat';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  content: any;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Enum defining the different visual modes for the 3D experience
export enum AppMode {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  FOCUS = 'FOCUS'
}

// MediaPipe HandLandmarker result types
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe Category type
export interface Category {
  score: number;
  categoryName: string;
}

export interface HandLandmarkerResult {
  landmarks?: HandLandmark[][];
  handednesses?: Category[][]; // MediaPipe 返回的是二维数组
}
