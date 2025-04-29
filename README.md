# Matter API CLI

Tools for exploring and documenting the Matter Reader API.

## Overview

Since Matter doesn't provide official API documentation, these tools allow you to:

1. **Explore the Matter API**: Systematically test various API endpoints
2. **Discover Working Endpoints**: Identify which endpoints return valid responses
3. **Generate Documentation**: Create markdown documentation based on the exploration results

## Getting Started

Before using these tools, make sure you have your phone ready to authentice



## Exploring the Matter API

The simplest way to explore the Matter API is to use:

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Run the main CLI
bun run start
```
## Where to scan the QR code

**To Autheticate you will need to open the Matter app on your phone**
1. Press the profile button on the bottom right of the nav bar
2. Press the setting button at the top left of the screen
3. Select integrations from the settings
4. Select Obsidian
5. Scan the QR code in the terminal

## Explore Endpoints

To Explore API endpoints that are listend in endpoints.json:

```bash
# Explore Endpoints
bun run explore
```

## Generating Documentation

To generate documentation from the API exploration results:

```bash
# Generate documentation
bun run docs
```

This will create comprehensive documentation based on the exploration results.

## Retrieving Highlights

You can also retrieve highlights from your Matter account:

```bash
# Get highlights from your Matter account
bun run highlights
```

## Understanding the Results

After exploration, several important files are generated:

1. **api-results.json**: Raw API responses for each endpoint
2. **successful-endpoints.json**: Summary of working endpoints and their supported methods
3. **Generated documentation files**: Human-readable documentation

Note: These files are included in the `.gitignore` to avoid committing personal data.

## Project Structure

```
matter-api-cli/
├── src/                # Source code
│   ├── api.ts          # API interface
│   ├── auth.ts         # Authentication logic
│   ├── cli.ts          # Main command-line interface
│   ├── docs-generator.ts # Documentation generator
│   ├── explorer.ts     # API exploration logic
│   ├── get-highlights.ts # Highlights retriever
│   ├── docs/           # Documentation templates
│   └── json/           # JSON configuration files
├── node_modules/       # Dependencies
├── .gitignore          # Git ignore rules
├── package.json        # Project configuration
├── bun.lock            # Bun lock file
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Available Scripts

- `bun run start`: Run the main CLI
- `bun run explore`: Run the API explorer
- `bun run docs`: Generate documentation
- `bun run auth`: Authenticate with Matter
- `bun run highlights`: Get highlights from Matter
- `bun run lint`: Lint TypeScript files

## Contributing

To improve these tools:
1. Add more API endpoints to explore
2. Enhance the documentation generation
3. Add new features to the CLI 