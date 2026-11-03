// A page that fails to draw says so, with the menu still working and a way on, instead of leaving a
// blank screen; nothing in the saga is touched. A page from an older version of the toolkit (its code
// no longer on the server after an update) asks to be reloaded.
import { Component, type ReactNode } from 'react';
import { useStore } from '../store/store';

interface Props {
  children: ReactNode;
  /** a new value (the page's address) clears the fault, so another page can be opened */
  resetKey: string;
  /** draw nothing in its place (for the tutorial panel) */
  quiet?: boolean;
}
interface State {
  error?: Error;
}

export class PageErrorBoundary extends Component<Props, State> {
  state: State = {};
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: undefined });
  }
  render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    if (this.props.quiet) return null;
    const stale = /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(e.message);
    const canUndo = useStore.getState().history.past.length > 0;
    return (
      <section className="card" role="alert">
        <div className="card-head">
          <h3>{stale ? 'The toolkit has been updated' : 'This page could not be shown'}</h3>
        </div>
        <p>
          {stale
            ? 'This page belongs to an older version of the toolkit. Reload to get the new one: your sagas are kept in this browser.'
            : 'Nothing in your sagas was lost. Undo the last change if it caused this, go back, or open another page from the menu.'}
        </p>
        <div className="row">
          {!stale && canUndo && (
            <button
              onClick={() => {
                const label = useStore.getState().undo();
                if (label) useStore.getState().setNotice(`Undone: ${label}.`);
                this.setState({ error: undefined });
              }}
            >
              Undo the last change
            </button>
          )}
          {!stale && <button onClick={() => window.history.back()}>Back</button>}
          <button className="primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
        <details>
          <summary className="small">What went wrong</summary>
          <pre className="small" style={{ whiteSpace: 'pre-wrap' }}>
            {e.message}
          </pre>
        </details>
      </section>
    );
  }
}
