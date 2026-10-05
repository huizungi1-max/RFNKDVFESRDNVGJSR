import { Component, type ReactNode } from 'react';

interface StageBoundaryProps {
  children: ReactNode;
}

interface StageBoundaryState {
  failed: boolean;
}

/**
 * Contains failures of the WebGL layer — WebGL unavailable, context creation
 * failing, or the stage chunk failing to load — so the document interface above
 * it remains fully usable.
 */
export class StageBoundary extends Component<StageBoundaryProps, StageBoundaryState> {
  override state: StageBoundaryState = { failed: false };

  static getDerivedStateFromError(): StageBoundaryState {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
