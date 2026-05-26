import type { HandTrackingSnapshot } from '../types/tracking'

export type PointerCommandType = 'move' | 'down' | 'up'

export interface PointerCommand {
  down: boolean
  type: PointerCommandType
  x: number
  y: number
}

type PointerSender = (command: PointerCommand) => void

const INDEX_TIP = 8
const DEFAULT_ENDPOINT = 'ws://127.0.0.1:47630/handflow'

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function createPointerCommand(
  snapshot: HandTrackingSnapshot,
  isPointerDown: boolean,
): PointerCommand | null {
  const indexTip = snapshot.primaryHand?.landmarks[INDEX_TIP]

  if (snapshot.status !== 'detected' || !indexTip) {
    return isPointerDown ? { down: false, type: 'up', x: 0, y: 0 } : null
  }

  const x = clamp(1 - indexTip.x)
  const y = clamp(indexTip.y)
  const gesture = snapshot.gesture

  if (gesture.name === 'pinch' && (gesture.phase === 'active' || gesture.phase === 'entering')) {
    return isPointerDown ? { down: true, type: 'move', x, y } : { down: true, type: 'down', x, y }
  }

  if (isPointerDown && (gesture.name !== 'pinch' || gesture.phase === 'exiting' || gesture.phase === 'idle')) {
    return { down: false, type: 'up', x, y }
  }

  if (gesture.name === 'open-palm' || gesture.name === 'none' || gesture.name === 'peace') {
    return { down: false, type: 'move', x, y }
  }

  return null
}

export class HandFlowPointerBridge {
  private enabled = false
  private isPointerDown = false
  private readonly send: PointerSender

  constructor(send: PointerSender) {
    this.send = send
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled

    if (!enabled && this.isPointerDown) {
      this.send({ down: false, type: 'up', x: 0, y: 0 })
      this.isPointerDown = false
    }
  }

  update(snapshot: HandTrackingSnapshot) {
    if (!this.enabled) {
      return
    }

    const command = createPointerCommand(snapshot, this.isPointerDown)

    if (!command) {
      return
    }

    this.isPointerDown = command.down
    this.send(command)
  }
}

export class PointerWebSocketTransport {
  private readonly endpoint: string
  private isConnecting = false
  private socket: WebSocket | null = null

  constructor(endpoint = DEFAULT_ENDPOINT) {
    this.endpoint = endpoint
  }

  close() {
    this.socket?.close()
    this.socket = null
  }

  send(command: PointerCommand) {
    this.ensureConnected()

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(command))
    }
  }

  private ensureConnected() {
    if (
      this.isConnecting ||
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    this.isConnecting = true
    this.socket = new WebSocket(this.endpoint)
    this.socket.addEventListener('open', () => {
      this.isConnecting = false
    })
    this.socket.addEventListener('close', () => {
      this.isConnecting = false
      this.socket = null
    })
    this.socket.addEventListener('error', () => {
      this.isConnecting = false
    })
  }
}
