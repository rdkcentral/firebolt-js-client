import { FireboltTransport } from "@firebolt-js/types";

/**
 * Mock transport implementation for testing without a real Firebolt backend.
 * This simulates the transport interface that would be provided by the
 * WPE Firebolt web extension in a real environment.
 */
export class MockTransport implements FireboltTransport {
  private connected = false;
  private messageQueue: string[] = [];

  send(data: string): void {
    if (!this.connected) {
      console.warn("Cannot send: transport not connected");
      return;
    }
    console.log("[MockTransport] Sending:", data);
    this.messageQueue.push(data);
  }

  open(): void {
    if (this.connected) {
      console.log("[MockTransport] Already connected");
      return;
    }
    console.log("[MockTransport] Opening connection");
    this.connected = true;
    setTimeout(() => {
      this.onOpen?.();
    }, 100);
  }

  close(): void {
    if (!this.connected) {
      console.log("[MockTransport] Already closed");
      return;
    }
    console.log("[MockTransport] Closing connection");
    this.connected = false;
    this.onClose?.();
  }

  onMessage?: (raw: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;

  /**
   * Simulate receiving a message from the Firebolt backend
   */
  simulateIncomingMessage(message: string): void {
    if (this.onMessage) {
      this.onMessage(message);
    }
  }

  /**
   * Simulate a transport error
   */
  simulateError(error: unknown): void {
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Get the message queue for testing
   */
  getMessageQueue(): string[] {
    return [...this.messageQueue];
  }

  /**
   * Clear the message queue
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}