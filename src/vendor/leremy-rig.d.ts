// Types for the parts of the vendored Leremy rig that LandingBobit uses.
export type RigPose = Record<string, number>;
export interface RigJoints { hR: { x: number; y: number }; hL: { x: number; y: number }; [joint: string]: { x: number; y: number } }
export interface RigAnimation { frame: (t: number) => RigPose }
export interface LeremyRigApi {
  CFG: Record<string, number>;
  ANIMATIONS: Record<string, RigAnimation>;
  computePose: (pose: RigPose, cfg: Record<string, number>, origin: { x: number; y: number }) => RigJoints;
  draw: (ctx: CanvasRenderingContext2D, j: RigJoints, cfg: Record<string, number>, opts: Record<string, unknown>) => void;
  drawShadow: (ctx: CanvasRenderingContext2D, cx: number, groundY: number, w: number, color?: string) => void;
}

declare global {
  interface Window { LeremyRig?: LeremyRigApi }
}
