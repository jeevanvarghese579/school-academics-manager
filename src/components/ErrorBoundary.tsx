import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SAM Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-error-600 dark:text-error-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Something went wrong</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            An unexpected error occurred. Try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-4"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
