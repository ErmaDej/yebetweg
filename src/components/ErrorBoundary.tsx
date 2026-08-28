import { Component } from "react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  /** When set, the boundary resets when this key changes (e.g., route path) */
  resetKey?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: undefined })
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
          <p className="mb-1 text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          {this.state.error && (
            <p className="mb-4 max-w-md break-words text-xs text-muted-foreground/70">
              {this.state.error.message.slice(0, 300)}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
            <Button onClick={this.handleReload}>Refresh Page</Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function RouteErrorFallback({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-2 text-xl font-bold">This section failed to load</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Please try again. If the problem persists, refresh the page.
      </p>
      <div className="flex gap-2">
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            Try again
          </Button>
        )}
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    </div>
  )
}