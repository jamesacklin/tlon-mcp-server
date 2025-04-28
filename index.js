const { Urbit } = require("@urbit/http-api");
const { unixToDa, formatUd } = require("@urbit/aura");

// Polyfill minimal browser globals needed by @urbit/http-api in Node
if (typeof global.window === "undefined") {
  global.window = { fetch: global.fetch };
}
if (typeof global.document === "undefined") {
  global.document = {
    hidden: true,
    addEventListener() {},
    removeEventListener() {},
  };
}

/**
 * Process command line arguments and environment variables to get configuration
 * 
 * Priority order:
 * 1. Command-line arguments
 * 2. Environment variables
 * 3. Default values
 * 
 * @returns {Object} Configuration object
 */
function getConfig() {
  // Parse command-line arguments (format: --key=value)
  const args = process.argv.slice(2).reduce((acc, arg) => {
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, value] = arg.slice(2).split('=');
      acc[key] = value;
    }
    return acc;
  }, {});

  // Default configuration
  const defaults = {
    ship: "zod",                            // Local development ship (without ~)
    code: "lidlut-tabwed-pillex-ridrup",    // Default +code
    host: "localhost",                      // Urbit host
    port: "80",                             // Urbit port
    recipient: "sampel-palnet",             // DM recipient (without ~)
    message: "hi"                           // Message content
  };

  // Get configuration from environment or defaults
  const config = {
    ship: args.ship || process.env.URBIT_SHIP || defaults.ship,
    code: args.code || process.env.URBIT_CODE || defaults.code,
    host: args.host || process.env.URBIT_HOST || defaults.host,
    port: args.port || process.env.URBIT_PORT || defaults.port,
    recipient: args.to || args.recipient || process.env.URBIT_RECIPIENT || defaults.recipient,
    message: args.message || args.msg || process.env.URBIT_MESSAGE || defaults.message
  };

  // Clean up ship and recipient names (remove ~ if present)
  config.ship = config.ship.replace(/^~/, '');
  config.recipient = config.recipient.replace(/^~/, '');

  // Construct the full URL
  config.url = `http://${config.host}:${config.port}`;
  
  return config;
}

/**
 * Patched connect method for Urbit API
 * 
 * This patch extends the default connect method to handle authentication via HTTP.
 * It performs the following steps:
 * 1. Makes a login request to the Urbit ship with the provided password
 * 2. Extracts the authentication cookie from the response
 * 3. Parses the node ID from the cookie if not already set
 * 4. Retrieves the ship name information
 * 
 * The original connect method is preserved below and this patched version
 * is used instead when connecting to an Urbit ship.
 */

const { connect } = Urbit.prototype;
Urbit.prototype.connect = async function patchedConnect() {
  const resp = await fetch(`${this.url}/~/login`, {
    method: "POST",
    body: `password=${this.code}`,
    credentials: "include",
  });

  if (resp.status >= 400) {
    throw new Error("Login failed with status " + resp.status);
  }

  const cookie = resp.headers.get("set-cookie");
  if (cookie) {
    const match = /urbauth-~([\w-]+)/.exec(cookie);
    if (!this.nodeId && match) {
      this.nodeId = match[1];
    }
    this.cookie = cookie;
  }
  await this.getShipName();
  await this.getOurName();
};

/**
 * Sends a direct message to another ship
 * 
 * @param {Object} api - The Urbit API instance
 * @param {string} fromShip - The sender's ship name
 * @param {string} toShip - The recipient's ship name
 * @param {string} text - The message text to send
 * @returns {Promise<void>}
 */

async function sendDm(api, fromShip, toShip, text) {
  console.log(`Sending DM to ${toShip}...`);

  const story = [
    {
      inline: [text],
    },
  ];

  const sentAt = Date.now();
  const idUd = formatUd(unixToDa(sentAt).toString());
  const id = `${fromShip}/${idUd}`;

  const delta = {
    add: {
      memo: {
        content: story,
        author: fromShip,
        sent: sentAt,
      },
      kind: null,
      time: null,
    },
  };

  const action = {
    ship: toShip,
    diff: {
      id,
      delta,
    },
  };

  await api.poke({
    app: "chat",
    mark: "chat-dm-action",
    json: action,
  });
  console.log("DM sent!");
}

/**
 * Main function that connects to an Urbit ship, sends a direct message, and cleans up
 * 
 * This function performs the following operations:
 * 1. Connects to an Urbit ship using authentication credentials
 * 2. Sends a direct message to a specified recipient
 * 3. Closes the connection channel
 * 4. Exits the process when complete
 * 
 * @async
 * @function main
 * @returns {Promise<void>}
 * @throws {Error} If connection or message sending fails
 */

async function main() {
  const config = getConfig();
  const shipName = `~${config.ship}`;
  const recipient = `~${config.recipient}`;

  console.log(`Connecting to Urbit ship at ${config.url}`);
  console.log(`Will send message "${config.message}" to ${recipient}`);

  const api = await Urbit.authenticate({
    ship: config.ship,
    url: config.url,
    code: config.code,
    verbose: true,
  });

  await sendDm(api, shipName, recipient, config.message);

  try {
    await api.delete();
  } catch (e) {
    console.warn("Warning: Failed to close channel cleanly", e);
  }
  console.log("Done!");
  process.exit(0);
}

// If this script is being run directly (not imported), execute main()
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// Export for use as a module in other scripts
module.exports = {
  sendDm,
  main
};
