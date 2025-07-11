import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // In production, send error to logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Card className="max-w-md w-full mx-4">
            <div className="text-center space-y-4">
              <div className="text-red-500 text-6xl">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                  <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
                    Error Details:
                  </h3>
                  <pre className="text-sm text-red-700 dark:text-red-300 overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
              
              <div className="flex gap-2 justify-center">
                <Button onClick={this.handleRetry} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Async error:', error, errorInfo);
    
    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }, []);
}
