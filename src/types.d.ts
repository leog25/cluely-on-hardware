declare module 'node-webcam' {
  export interface WebcamOptions {
    width?: number;
    height?: number;
    quality?: number;
    delay?: number;
    saveShots?: boolean;
    output?: string;
    device?: string | false;
    callbackReturn?: string;
    verbose?: boolean;
  }

  export function create(options: WebcamOptions): any;
  export function list(callback: (list: string[]) => void): void;
}