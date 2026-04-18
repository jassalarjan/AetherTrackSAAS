/**
 * mobileSocketManager.js
 *
 * Socket.IO client configured for reliable operation inside a Capacitor WebView.
 *
 * Key differences vs browser:
 *  - Uses polling→WebSocket upgrade to avoid WebView WS quirks
 *  - Reconnects aggressively on foreground resume
 *  - Pauses heartbeat when app goes to background to save battery
 *  - Re-authenticates after token refresh
 */
import { io }        from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { getAccessToken } from './secureTokenStorage';

const isNative = Capacitor.isNativePlatform();

// ─── Singleton socket instance ────────────────────────────────────────────
let _socket = null;
let _reconnectTimer = null;

const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || '';

// ─── Create / get socket ──────────────────────────────────────────────────
export async function getSocket() {
  if (_socket && _socket.connected) return _socket;

  const token = await getAccessToken();

  _socket = io(WS_URL, {
    // Start with polling so Capacitor's WebView HTTP stack handles the
    // initial handshake, then upgrade to WebSocket.
    transports:      ['polling', 'websocket'],
    upgrade:         true,
    rememberUpgrade: true,

    // Auth header sent on every connection/reconnection
    auth: { token },

    // Reconnection strategy
    reconnection:       true,
    reconnectionAttempts: Infinity,
    reconnectionDelay:  1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,

    // Timeouts
    timeout:   20000,
    pingTimeout: 30000,
    pingInterval: 25000,

    // Path (must match your Express Socket.IO mount point)
    path: '/socket.io',

    // Force new connection on each call to getSocket if the old one died
    forceNew: false,
  });

  _bindSocketEvents(_socket);
  return _socket;
}

// ─── Re-authenticate (call this after a token refresh) ───────────────────
export async function reauthSocket() {
  if (!_socket) return;
  const token = await getAccessToken();
  _socket.auth = { token };
  _socket.disconnect().connect();
}

// ─── Disconnect (call on logout) ──────────────────────────────────────────
export function disconnectSocket() {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }
  clearTimeout(_reconnectTimer);
}

// ─── Lifecycle hooks (called from useMobileCapabilities) ──────────────────

/**
 * registerSocketLifecycleHandlers
 *
 * Wires the socket to Capacitor foreground/background events so it:
 *  - Reconnects immediately when the user brings the app back to the screen
 *  - Stops pinging in background to save battery & avoid OS kill
 */
export function registerSocketLifecycleHandlers() {
  if (!isNative) return;

  window.addEventListener('aether:foreground', async () => {
    clearTimeout(_reconnectTimer);
    if (!_socket) { await getSocket(); return; }
    if (!_socket.connected) {
      _socket.connect();
    }
  });

  window.addEventListener('aether:background', () => {
    // Do not disconnect — just stop pinging (socket will naturally timeout
    // and the server removes the session; we reconnect on foreground)
    clearTimeout(_reconnectTimer);
    _reconnectTimer = setTimeout(() => {
      if (_socket && !_socket.connected) {
        // If still in background after 5 min, save battery by disconnecting
        _socket.disconnect();
      }
    }, 5 * 60 * 1000);
  });

  window.addEventListener('aether:offline', () => {
    if (_socket) _socket.io.opts.reconnection = false;
  });

  window.addEventListener('aether:online', async () => {
    if (!_socket) { await getSocket(); return; }
    _socket.io.opts.reconnection = true;
    if (!_socket.connected) _socket.connect();
  });
}

// ─── Internal ─────────────────────────────────────────────────────────────
function _bindSocketEvents(socket) {
  socket.on('connect', () => {
    console.log('[Socket] Connected');
    window.dispatchEvent(new CustomEvent('aether:socketConnected', { detail: { id: socket.id } }));
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected');
    window.dispatchEvent(new CustomEvent('aether:socketDisconnected', { detail: { reason } }));
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  // Token expired — server tells us to refresh
  socket.on('auth:expired', async () => {
    console.log('[Socket] Auth expired, reconnecting...');
    await reauthSocket();
  });
}
