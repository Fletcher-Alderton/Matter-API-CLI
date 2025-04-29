import { CLIENT_TYPE, ENDPOINTS, QRLoginExchangeResponse } from './api.js';
import * as qrcode from 'qrcode-terminal';
import * as fs from 'fs/promises';

const SETTINGS_FILE = 'src/json/settings.json';
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export interface Settings {
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Load saved authentication settings from disk. Returns defaults if none found.
 */
export async function loadSettings(): Promise<Settings> {
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(content) as Settings;
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

/**
 * Persist authentication settings to disk.
 */
export async function saveSettings(settings: Settings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

/**
 * Perform QR-based authentication: generates a QR code in the terminal and polls for tokens.
 */
export async function authenticate(): Promise<Settings> {
  console.log('Starting Matter authentication...');
  const triggerResp = await fetch(ENDPOINTS.QR_LOGIN_TRIGGER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_type: CLIENT_TYPE }),
  });
  const { session_token } = await triggerResp.json();
  console.log('Scan this QR code in the Matter app:');
  qrcode.generate(session_token, { small: true });

  const settings = await loadSettings();
  let attempts = 0;
  while (attempts < 600) {
    const resp = await fetch(ENDPOINTS.QR_LOGIN_EXCHANGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token }),
    });
    const payload: QRLoginExchangeResponse = await resp.json();
    if (payload.access_token) {
      settings.accessToken = payload.access_token;
      settings.refreshToken = payload.refresh_token ?? null;
      await saveSettings(settings);
      console.log('Authentication successful!');
      return settings;
    }
    process.stdout.write('.');
    await sleep(1000);
    attempts++;
  }

  throw new Error('QR login exchange timed out.');
} 