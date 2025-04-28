# Tlon MCP Server

An MCP (Model Context Protocol) server that provides tools for interacting with Tlon's Urbit services.

## Features

- **send-dm tool**: Send direct messages to Urbit ships

## Prerequisites

- Node.js (v16+)
- Access to an Urbit ship

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Configuration

Configure the server using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `URBIT_SHIP` | Your Urbit ship name (without ~) | zod |
| `URBIT_CODE` | Your Urbit +code | lidlut-tabwed-pillex-ridrup |
| `URBIT_HOST` | Urbit host | localhost |
| `URBIT_PORT` | Urbit port | 80 |
| `PORT` | MCP server port | 3001 |
| `MCP_TRANSPORT` | Transport type (http or stdio) | http |

## Usage

### Starting the server

```bash
# Start with HTTP transport
npm run start:http

# Start with stdio transport
npm start

# Development mode with auto-reload
npm run dev
```

### Setting up in Cursor

Create a `.cursor/mcp.json` file in your project directory or a global configuration at `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "tlon-mcp": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

### Using the send-dm tool

Once configured in Cursor, you can use the send-dm tool in your AI interactions:

```
Send a message to ~sampel-palnet on Urbit
```

## Available Tools

### send-dm

Sends a direct message to an Urbit ship.

Parameters:
- `recipient`: The recipient's ship name (with or without ~)
- `message`: The message text to send

## License

MIT