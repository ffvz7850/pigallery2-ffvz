import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;

  /**
   * Request a wake lock to prevent the screen from dimming or turning off
   */
  async requestWakeLock(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Wake Lock API is not supported in this browser');
      return;
    }

    if (this.wakeLock) {
      return;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');

      // Listen for wake lock release
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch (err) {
      console.error('Failed to request wake lock:', err);
    }
  }

  /**
   * Release the current wake lock
   */
  async releaseWakeLock(): Promise<void> {
    if (!this.wakeLock) {
      return;
    }

    try {
      await this.wakeLock.release();
      this.wakeLock = null;
    } catch (err) {
      console.error('Failed to release wake lock:', err);
    }
  }

  /**
   * Check if wake lock is currently active
   */
  isWakeLockActive(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }

  /**
   * Check if Wake Lock API is supported
   */
  isSupported(): boolean {
    return 'wakeLock' in navigator;
  }
}
