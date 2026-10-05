import type { SectionId } from '@/content/schema';

/**
 * Spatial UI bridge: semantic DOM elements (labels, callouts) that track points
 * in the 3D world. Text stays in the accessible document; only its position comes
 * from the stage, which projects every anchor after rendering and writes
 * transforms directly — no React work per frame.
 *
 * The DOM registers labels by anchor id; scenes register anchors. Either side
 * may appear first.
 */

export interface PointLike {
  x: number;
  y: number;
  z: number;
}

export interface AnchorSource {
  /** The section whose engagement governs the anchor's visibility. */
  readonly section: SectionId;
  /** Writes the anchor's current world position into `out`. */
  read(out: PointLike): void;
}

export interface LabelBinding {
  readonly element: HTMLElement;
  readonly anchor: string;
  /** Last written state, so unchanged frames cost nothing. */
  x: number;
  y: number;
  visible: boolean | null;
}

const anchors = new Map<string, AnchorSource>();
const labels = new Set<LabelBinding>();

export const spatial = {
  anchors: anchors as ReadonlyMap<string, AnchorSource>,
  labels: labels as ReadonlySet<LabelBinding>,

  registerAnchor(id: string, source: AnchorSource): () => void {
    anchors.set(id, source);
    return () => {
      if (anchors.get(id) === source) anchors.delete(id);
    };
  },

  registerLabel(element: HTMLElement, anchor: string): () => void {
    const binding: LabelBinding = { element, anchor, x: Number.NaN, y: Number.NaN, visible: null };
    labels.add(binding);
    return () => {
      labels.delete(binding);
    };
  },
};
