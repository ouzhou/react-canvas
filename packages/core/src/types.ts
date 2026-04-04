export type ViewStyle = {
  backgroundColor?: string;
};

export type ViewProps = {
  style?: ViewStyle;
  children?: unknown;
};

export interface RenderBackend {
  clear(width: number, height: number): void;
  fillRect(x: number, y: number, w: number, h: number, color: string): void;
}
