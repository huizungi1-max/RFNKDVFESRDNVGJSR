import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Called once with the error that disabled this subtree. */
  onError: (error: unknown) => void;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Contains a failure to its subtree. Used around the whole stage (WebGL missing,
 * context creation failing, the chunk failing to load) and around each section's
 * scene, so one broken asset never takes down anything else.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    this.props.onError(error);
  }

  override render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
