#!/usr/bin/env node

import { loadSettings, authenticate, Settings } from './auth.js';
import { authedRequest, FeedEntry, ENDPOINTS } from './api.js';
import * as fs from 'fs/promises';

const DATA_FILE = 'src/json/highlights.json';

/**
 * Fetch all highlights feed entries by paging through the Matter API.
 * @param accessToken - Bearer token for authentication
 * @returns Array of FeedEntry objects
 */
export async function fetchHighlights(accessToken: string): Promise<FeedEntry[]> {
  let url = ENDPOINTS.HIGHLIGHTS_FEED;
  const allEntries: FeedEntry[] = [];

  while (url) {
    const response = await authedRequest(accessToken, url);
    allEntries.push(...response.feed);
    url = response.next;
  }

  return allEntries;
}

// Main execution function
(async () => {
  let settings: Settings = await loadSettings();
  if (!settings.accessToken) {
    settings = await authenticate();
  }
  if (!settings.accessToken) {
    console.error('No access token. Please rerun authentication.');
    process.exit(1);
  }

  console.log('Fetching highlights...');
  const highlights = await fetchHighlights(settings.accessToken);
  await fs.writeFile(DATA_FILE, JSON.stringify(highlights, null, 2));
  console.log(`\nSaved ${highlights.length} highlights to ${DATA_FILE}`);
})(); 