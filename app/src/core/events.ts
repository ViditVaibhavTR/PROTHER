import * as vscode from 'vscode';

/**
 * Typed event emitter helper.
 * Wraps vscode.EventEmitter to reduce boilerplate for the
 * `_onX = new EventEmitter<T>()` / `onX = this._onX.event` pattern.
 */
export class TypedEvent<T> implements vscode.Disposable {
  private readonly _emitter = new vscode.EventEmitter<T>();

  /** Subscribe to this event */
  readonly event: vscode.Event<T> = this._emitter.event;

  /** Fire the event */
  fire(data: T): void {
    this._emitter.fire(data);
  }

  dispose(): void {
    this._emitter.dispose();
  }
}
