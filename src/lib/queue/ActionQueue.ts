/**
 * ActionQueue manages asynchronous operations in sequence.
 * This prevents UI blocking during high-concurrency batch operations.
 */
export class ActionQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  add(action: () => Promise<void>) {
    this.queue.push(action);
    this.process();
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const action = this.queue.shift();
      if (action) {
        try {
          await action();
        } catch (error) {
          console.error('[ActionQueue] Action failed:', error);
          // Optional: Add retry logic or error reporting here
        }
      }
    }
    
    this.isProcessing = false;
  }

  get length() {
    return this.queue.length;
  }
}

export const globalActionQueue = new ActionQueue();
