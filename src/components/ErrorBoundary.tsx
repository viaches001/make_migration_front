import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Helmsman Automations crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: 32,
            fontFamily: 'system-ui, sans-serif',
            background: '#f7f6f2',
            color: '#001f1e',
          }}
        >
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: 16 }}>
            The UI hit a runtime error. Details below:
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 16,
              fontSize: 13,
            }}
          >
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}
