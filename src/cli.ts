#!/usr/bin/env bun

import { exploreAPI } from './explorer.js';
import { generateDocs } from './docs-generator.js';
import { authenticate } from './auth.js';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompts the user for input
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Main function for the Matter API Explorer
 */
async function run(): Promise<void> {
  console.log('\n=== Matter API Explorer ===');
  console.log('This tool helps you work with the Matter API.');
  
  const options = [
    '1. Authenticate with Matter API',
    '2. Run API exploration and generate documentation',
    '3. Exit'
  ];
  
  while (true) {
    console.log('\nOptions:');
    options.forEach(option => console.log(option));
    
    const choice = await prompt('\nEnter your choice (1-3): ');
    
    if (choice === '1') {
      // Run authentication
      console.log('\nStarting authentication process...');
      try {
        const settings = await authenticate();
        console.log(`Authentication successful! Access token: ${settings.accessToken?.substring(0, 10)}...`);
      } catch (error) {
        console.error('Authentication failed:', error);
      }
    } else if (choice === '2') {
      // Run API exploration and documentation
      console.log('\nRunning API exploration...');
      try {
        const endpoints = await exploreAPI();
        
        if (endpoints.length > 0) {
          console.log(`\nFound ${endpoints.length} working endpoints.`);
          
          // Generate documentation
          console.log('\nGenerating API documentation...');
          await generateDocs();
          
          console.log('\nAPI exploration and documentation complete!');
          console.log('Check the api-docs directory for results:');
          console.log('- api-results.json: Raw API responses');
          console.log('- successful-endpoints.json: Summary of working endpoints');
          console.log('- matter-api-docs.md: Markdown documentation');
        } else {
          console.log('\nNo working endpoints found. Check your authentication token.');
        }
      } catch (error) {
        console.error('An error occurred:', error);
      }
    } else if (choice === '3') {
      console.log('Exiting...');
      break;
    } else {
      console.log('Invalid choice. Please select 1, 2, or 3.');
    }
  }
  
  rl.close();
}

// Start the program
run().catch(error => {
  console.error('Unhandled error:', error);
  rl.close();
  process.exit(1);
}); 