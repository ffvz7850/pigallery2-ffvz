export class Event<T> {
  protected handlers: ((data?: T) => void)[] = [];
  protected singleHandlers: ((data?: T) => void)[] = [];

  public on(handler: (data?: T) => void): void {
    if (typeof handler !== 'function') {
      throw new Error('Event::on: Handler is not a function');
    }
    this.handlers.push(handler);
  }

  public once(handler: (data?: T) => void): void {
    if (typeof handler !== 'function') {
      throw new Error('Event::once: Handler is not a function');
    }
    this.singleHandlers.push(handler);
  }

  public wait(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.once(() => {
        resolve();
      });
    });
  }

  public off(handler: (data?: T) => void): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
    this.singleHandlers = this.singleHandlers.filter((h) => h !== handler);
  }

  public allOff(): void {
    this.handlers = [];
    this.singleHandlers = [];
  }

  public trigger(data?: T): void {
    if (this.handlers) {
      this.handlers.slice(0).forEach((h) => h(data));
    }
    if (this.singleHandlers) {
      this.singleHandlers.slice(0).forEach((h) => h(data));
      this.singleHandlers = [];
    }
  }

  public hasListener(): boolean {
    return this.handlers.length !== 0 || this.singleHandlers.length !== 0;
  }
}



