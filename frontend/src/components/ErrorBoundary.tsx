import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred while rendering this page.</p>
          <button
            onClick={this.handleReset}
            style={{
              background: '#e94560',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
