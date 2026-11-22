import { Component, type PropsWithChildren } from "react";
interface Props extends PropsWithChildren {
  resetKey?: string;
  onError?: (event: { kind: "render" }) => void;
}
export class RuntimeErrorBoundary extends Component<
  Props,
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    try {
      this.props.onError?.({ kind: "render" });
    } catch {
      /* Reporting must not break recovery. */
    }
  }
  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed)
      this.retry();
  }
  retry = () =>
    this.setState((state) => ({ failed: false, attempt: state.attempt + 1 }));
  render() {
    if (this.state.failed)
      return (
        <div
          role="alert"
          className="m-4 rounded-lg border border-red-200 bg-white p-6 text-neutral-800"
        >
          <h2 className="font-semibold">
            This content could not be displayed.
          </h2>
          <p className="my-2 text-sm">
            Try again to reload this part of the page.
          </p>
          <button
            type="button"
            className="rounded border px-3 py-2 focus-visible:ring-2"
            onClick={this.retry}
          >
            Try again
          </button>
        </div>
      );
    return (
      <div key={this.state.attempt} className="contents">
        {this.props.children}
      </div>
    );
  }
}
