# tlon-node

A Node.js script that connects to an Urbit ship, authenticates, and interacts with various Tlon agents.

## Features

- Connect to a running Urbit ship using HTTP API
- Authenticate with a password/code
- Configurable via command-line arguments, environment variables, or defaults
- Can be used as a module in other Node.js applications

## Requirements

- Node.js 18+ (for global fetch)
- `@urbit/http-api` and `@urbit/aura` packages

## Usage

### Command-line

```bash
# Basic usage with defaults (connects to ~zod on localhost:80 and sends a DM to ~sampel-palnet)
node index.js

# Send a DM to a recipient
node index.js --to=sampel-palnet

# Custom message
node index.js --message="hello from node"

# Connect to a different ship
node index.js --ship=sampel-palnet --code=your-code --host=ship.tlon.network --port=443
```

### Environment Variables

Set any of these environment variables before running the script:

```bash
# Set configuration via environment
export URBIT_SHIP=zod
export URBIT_CODE=lidlut-tabwed-pillex-ridrup
export URBIT_HOST=localhost
export URBIT_PORT=80
export URBIT_RECIPIENT=sampel-palnet
export URBIT_MESSAGE="Hello via environment variables"

# Run with environment configuration
node index.js
```

### As a Module

```javascript
const urbitBot = require('./path/to/bot');

// Use with default or environment variable configuration
async function sendMessage() {
  await urbitBot.main();
}

// Or use the sendDm function directly
async function customSend() {
  const { Urbit } = require('@urbit/http-api');
  
  const api = await Urbit.authenticate({
    ship: 'zod',
    url: 'http://localhost:80',
    code: 'your-code',
  });
  
  await urbitBot.sendDm(api, '~zod', '~sampel-palnet', 'Custom message');
}
```

## Configuration Options

| Command-line Argument | Environment Variable | Default | Description |
|-----------------------|----------------------|---------|-------------|
| `--ship=VALUE` | `URBIT_SHIP` | `zod` | Ship to connect to (without ~) |
| `--code=VALUE` | `URBIT_CODE` | `lidlut-tabwed-pillex-ridrup` | Authentication code |
| `--host=VALUE` | `URBIT_HOST` | `localhost` | Hostname of Urbit ship |
| `--port=VALUE` | `URBIT_PORT` | `80` | Port of Urbit ship |
| `--to=VALUE` or `--recipient=VALUE` | `URBIT_RECIPIENT` | `sampel-palnet` | Recipient ship (without ~) |
| `--message=VALUE` or `--msg=VALUE` | `URBIT_MESSAGE` | `hi` | Message content |

## Troubleshooting

- If you see "Login failed with status 400", check that your ship name and code are correct
- If you see "Failed to PUT channel", ensure your authentication code is valid

## License

MIT