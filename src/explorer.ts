import { authedRequest, MATTER_API_HOST } from './api.js';
import { loadSettings } from './auth.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const RESULTS_FILE = 'src/json/api-results.json';
const SUCCESSFUL_ENDPOINTS_FILE = 'src/json/successful-endpoints.json';
const ENDPOINTS_FILE = 'src/json/endpoints.json';

// HTTP methods to test
const METHODS = ['GET', 'POST'];

// Potential query parameters to try
const QUERY_PARAMS: Record<string, string[]> = {
  'library_items/highlights_feed/': ['limit=10', 'offset=0'],
  'library_items/': ['limit=10', 'offset=0', 'sort=recent', 'sort=oldest', 'status=active', 'status=archived'],
  'search/': ['q=test', 'limit=10'],
  'tags/': ['limit=10', 'offset=0'],
  'highlights/': ['limit=10', 'offset=0', 'sort=recent'],
  'collections/': ['limit=10', 'offset=0'],
  'user/reading_history/': ['limit=10', 'offset=0'],
  'feeds/home/': ['limit=10', 'offset=0']
};

// Response cache to avoid duplicate requests
const responseCache: Record<string, any> = {};

// Stored IDs from successful responses to use in parameterized endpoints
const storedIds: Record<string, string[]> = {
  'library_items': [],
  'highlights': [], 
  'tags': [],
  'collections': []
};

/**
 * Tests an API endpoint with the given HTTP method
 */
async function testEndpoint(accessToken: string, endpoint: string, method: string): Promise<any> {
  const cacheKey = `${method}:${endpoint}`;
  
  if (responseCache[cacheKey]) {
    console.log(`Using cached response for ${method} ${endpoint}`);
    return responseCache[cacheKey];
  }
  
  try {
    console.log(`Testing: ${method} ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      // For POST requests, include an empty body
      ...(method === 'POST' ? { body: JSON.stringify({}) } : {}),
    });
    
    if (!response.ok) {
      return {
        status: response.status,
        statusText: response.statusText,
        success: false,
      };
    }
    
    const data = await response.json();
    
    // Extract IDs from successful responses for later use in parameterized endpoints
    extractIds(endpoint, data);
    
    const result = {
      status: response.status,
      statusText: response.statusText,
      success: true,
      dataSchema: extractSchema(data),
      dataPreview: truncateData(data),
    };
    
    responseCache[cacheKey] = result;
    return result;
  } catch (error) {
    return {
      status: 'error',
      statusText: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
}

/**
 * Extract and store IDs from successful API responses
 */
function extractIds(endpoint: string, data: any): void {
  try {
    // Extract IDs based on endpoint type
    if (endpoint.includes('library_items/')) {
      if (data.feed) {
        for (const entry of data.feed.slice(0, 5)) {
          if (entry.id && !storedIds.library_items.includes(entry.id)) {
            storedIds.library_items.push(entry.id);
          }
          
          if (entry.content?.id && !storedIds.library_items.includes(entry.content.id)) {
            storedIds.library_items.push(entry.content.id);
          }
        }
      }
    } else if (endpoint.includes('highlights/')) {
      if (data.feed) {
        for (const entry of data.feed.slice(0, 5)) {
          if (entry.id && !storedIds.highlights.includes(entry.id)) {
            storedIds.highlights.push(entry.id);
          }
        }
      }
    } else if (endpoint.includes('tags/')) {
      if (Array.isArray(data)) {
        for (const tag of data.slice(0, 5)) {
          if (tag.id && !storedIds.tags.includes(tag.id)) {
            storedIds.tags.push(tag.id);
          }
        }
      }
    } else if (endpoint.includes('collections/')) {
      if (Array.isArray(data)) {
        for (const collection of data.slice(0, 5)) {
          if (collection.id && !storedIds.collections.includes(collection.id)) {
            storedIds.collections.push(collection.id);
          }
        }
      }
    }
  } catch (error) {
    console.log(`Error extracting IDs from ${endpoint}:`, error);
  }
}

/**
 * Replace {id} placeholders in endpoints with actual IDs if available
 */
function resolveParameterizedEndpoint(endpoint: string): string[] {
  // If endpoint contains {id}, try to replace with stored IDs
  if (endpoint.includes('{id}')) {
    const resolvedEndpoints: string[] = [];
    
    // Determine which type of ID to use
    let idType = '';
    if (endpoint.startsWith('library_items/')) {
      idType = 'library_items';
    } else if (endpoint.startsWith('highlights/')) {
      idType = 'highlights';
    } else if (endpoint.startsWith('tags/')) {
      idType = 'tags';
    } else if (endpoint.startsWith('collections/')) {
      idType = 'collections';
    }
    
    if (idType && storedIds[idType].length > 0) {
      // Use at most 2 IDs to avoid too many requests
      const idsToUse = storedIds[idType].slice(0, 2);
      
      for (const id of idsToUse) {
        resolvedEndpoints.push(endpoint.replace('{id}', id));
      }
      
      return resolvedEndpoints;
    }
    
    // If no stored IDs available, use a placeholder fake ID
    return [endpoint.replace('{id}', 'unknown-id')];
  }
  
  // No placeholders, return the original endpoint
  return [endpoint];
}

/**
 * Extracts a schema from API response data
 */
function extractSchema(data: any): any {
  if (data === null) return 'null';
  if (typeof data !== 'object') return typeof data;
  
  if (Array.isArray(data)) {
    if (data.length === 0) return 'empty array';
    return [extractSchema(data[0])];
  }
  
  const schema: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    schema[key] = extractSchema(value);
  }
  return schema;
}

/**
 * Truncates response data to avoid huge output files
 */
function truncateData(data: any): any {
  if (data === null) return null;
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.slice(0, 2).map(truncateData);
  }
  
  const truncated: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    truncated[key] = truncateData(value);
    
    // Truncate long string values
    if (typeof truncated[key] === 'string' && truncated[key].length > 100) {
      truncated[key] = truncated[key].substring(0, 100) + '...';
    }
  }
  return truncated;
}

/**
 * Load endpoints from file
 */
async function loadEndpoints(): Promise<string[]> {
  try {
    const data = await fs.readFile(ENDPOINTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading endpoints from ${ENDPOINTS_FILE}:`, error);
    return [];
  }
}

/**
 * Main function to test multiple API endpoints
 */
async function exploreAPI() {
  try {
    // Create json directory if it doesn't exist
    const jsonDir = path.dirname(RESULTS_FILE);
    await fs.mkdir(jsonDir, { recursive: true });
    
    // Load settings to get access token
    const settings = await loadSettings();
    if (!settings.accessToken) {
      console.error('No access token found. Please authenticate first by running main.ts');
      process.exit(1);
    }
    
    // Load endpoints from file
    const endpoints = await loadEndpoints();
    if (endpoints.length === 0) {
      console.error(`No endpoints found in ${ENDPOINTS_FILE}. Please make sure the file exists and contains valid endpoints.`);
      process.exit(1);
    }
    
    // Sort endpoints to put non-parameterized ones first
    // This helps us collect IDs before testing endpoints that need them
    const sortedEndpoints = endpoints.sort((a, b) => {
      const aHasId = a.includes('{id}');
      const bHasId = b.includes('{id}');
      
      if (aHasId && !bHasId) return 1; // Put parameterized endpoints later
      if (!aHasId && bHasId) return -1;
      return 0;
    });
    
    console.log(`Testing ${sortedEndpoints.length} API endpoints from ${ENDPOINTS_FILE}...`);
    
    const accessToken = settings.accessToken;
    const results: Record<string, any> = {};
    
    // Test each endpoint with each method
    for (const basePath of sortedEndpoints) {
      // Resolve any parameter placeholders like {id}
      const resolvedPaths = resolveParameterizedEndpoint(basePath);
      
      for (const resolvedPath of resolvedPaths) {
        const fullEndpoint = `${MATTER_API_HOST}/${resolvedPath}`;
        results[resolvedPath] = {};
        
        // Test the base endpoint with each method
        for (const method of METHODS) {
          results[resolvedPath][method] = await testEndpoint(accessToken, fullEndpoint, method);
        }
        
        // Test with query parameters if available
        const basePathForParams = basePath.replace(/\{id\}.*$/, ''); // Match parameters for the base path type
        if (QUERY_PARAMS[basePathForParams]) {
          results[resolvedPath].withParams = {};
          
          for (const param of QUERY_PARAMS[basePathForParams]) {
            const paramEndpoint = `${fullEndpoint}?${param}`;
            results[resolvedPath].withParams[param] = await testEndpoint(accessToken, paramEndpoint, 'GET');
          }
        }
      }
    }
    
    // Write results to file
    await fs.writeFile(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`\nAPI exploration complete. Results saved to ${RESULTS_FILE}`);
    
    // Generate summary of successful endpoints
    const successfulEndpoints = Object.entries(results)
      .filter(([_, methodResults]) => 
        Object.values(methodResults).some((result: any) => 
          result.success === true || 
          (result.withParams && Object.values(result.withParams).some((r: any) => r.success === true))
        )
      )
      .map(([endpoint, methodResults]) => ({
        endpoint,
        methods: Object.entries(methodResults)
          .filter(([method, result]) => method !== 'withParams' && (result as any).success === true)
          .map(([method]) => method),
        params: methodResults.withParams ? 
          Object.entries(methodResults.withParams)
            .filter(([_, result]) => (result as any).success === true)
            .map(([param]) => param) : []
      }));
    
    await fs.writeFile(SUCCESSFUL_ENDPOINTS_FILE, JSON.stringify(successfulEndpoints, null, 2));
    console.log(`Summary of successful endpoints saved to ${SUCCESSFUL_ENDPOINTS_FILE}`);
    
    return successfulEndpoints;
  } catch (error) {
    console.error('Error during API exploration:', error);
    return [];
  }
}

// Run the API explorer if this script is executed directly
if (require.main === module) {
  exploreAPI();
}

export { exploreAPI }; 