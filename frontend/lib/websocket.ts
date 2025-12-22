/**
 * WebSocket client for real-time optimization updates
 */
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8001';

class WebSocketClient {
    private socket: Socket | null = null;

    connect() {
        if (this.socket?.connected) {
            return;
        }

        this.socket = io(WS_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    subscribeToOptimization(jobId: string, callback: (data: any) => void) {
        if (!this.socket) {
            this.connect();
        }

        this.socket?.emit('subscribe', { job_id: jobId });
        this.socket?.on('optimization_update', callback);
    }

    unsubscribe(jobId: string) {
        this.socket?.emit('unsubscribe', { job_id: jobId });
        this.socket?.off('optimization_update');
    }
}

export const wsClient = new WebSocketClient();
