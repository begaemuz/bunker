import { Component, type ReactNode } from 'react';
import { clearProfile } from '../services/storage';

/** Если что-то сломалось при отрисовке — показываем ошибку, а не пустой экран. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="loading" style={{ padding: 24, textAlign: 'center', letterSpacing: 0, color: '#eef2f5', fontWeight: 400 }}>
        <div>
          <div style={{ color: '#ff5a4a', fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Ошибка запуска</div>
          <div className="small muted" style={{ marginBottom: 16, wordBreak: 'break-word' }}>{String(this.state.error.message)}</div>
          <button className="btn btn-primary btn-block" onClick={() => location.reload()}>
            Перезапустить
          </button>
          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 8 }}
            onClick={async () => {
              await clearProfile();
              location.reload();
            }}
          >
            Сбросить сохранение и начать заново
          </button>
        </div>
      </div>
    );
  }
}
