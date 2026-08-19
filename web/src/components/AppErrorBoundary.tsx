import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', { error, componentStack: info.componentStack })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <section style={{ maxWidth: 560, textAlign: 'center' }}>
          <h1>Không thể hiển thị giao diện</h1>
          <p>Ứng dụng gặp lỗi ngoài dự kiến. Vui lòng tải lại trang hoặc thử lại sau.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Tải lại ứng dụng
          </button>
        </section>
      </main>
    )
  }
}
