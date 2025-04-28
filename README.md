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

**Important:** Always run `npm install` manually in the terminal before using with Claude Desktop or any other MCP client. This prevents installation output from interfering with the MCP protocol.

## Configuration

Configure the server using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `URBIT_SHIP` | Your Urbit ship name (without ~) | zod |
| `URBIT_CODE` | Your Urbit +code | lidlut-tabwed-pillex-ridrup |
| `URBIT_HOST` | Urbit host | localhost |
| `URBIT_PORT` | Urbit port | 80 |
| `PORT` | MCP server port (HTTP mode only) | 3001 |
| `MCP_TRANSPORT` | Transport type (http or stdio) | stdio |

## Usage

### Starting the server

```bash
# Start with default stdio transport
npm start

# Start with HTTP transport
export MCP_TRANSPORT=http && npm start

# Development mode with auto-reload
npm run dev
```

### Setting up with Claude Desktop

The default stdio mode works seamlessly with Claude Desktop. Create or edit the Claude Desktop configuration file at:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

With the following content:

```json
{
  "mcpServers": {
    "tlon-mcp": {
      "command": "/bin/sh",
      "args": ["-c", "cd /path/to/server && node index.js"]
    }
  }
}
```

**Important:** Be sure to run `npm install` in the server directory first before configuring Claude Desktop.

### Using the send-dm tool

Once configured, you can use the send-dm tool:

```
Send a message to ~sampel-palnet
```

## Available Tools

### send-dm

Sends a direct message to another ship.

Parameters:
- `recipient`: The recipient's ship name (with or without ~)
- `message`: The message text to send

## License

MIT