import { Urbit } from "@urbit/http-api";
import { unixToDa, formatUd } from "@urbit/aura";
import { FastMCP } from "fastmcp";
import z from "zod";

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

// Redirect console.log to stderr in stdio mode to avoid interfering with MCP protocol
// Only use normal console.log if explicitly in HTTP mode
if (process.env.MCP_TRANSPORT !== "http") {
  const originalConsoleLog = console.log;
  console.log = function() {
    console.error.apply(console, arguments);
  };
}

/**
 * Process environment variables to get configuration
 * 
 * @returns {Object} Configuration object with default values
 */
function getConfig() {
  // Default configuration
  const defaults = {
    ship: "zod",                            // Local development ship (without ~)
    code: "lidlut-tabwed-pillex-ridrup",    // Default +code
    host: "localhost",                      // Urbit host
    port: "8080",                           // Urbit port (commonly 8080 for local development)
  };

  // Get configuration from environment or defaults
  const config = {
    ship: process.env.URBIT_SHIP || defaults.ship,
    code: process.env.URBIT_CODE || defaults.code,
    host: process.env.URBIT_HOST || defaults.host,
    port: process.env.URBIT_PORT || defaults.port,
  };

  // Clean up ship name (remove ~ if present)
  config.ship = config.ship.replace(/^~/, '');

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
  
  try {
    // Verify API connection is still active with a more reliable method
    console.log("Verifying connection status...");
    try {
      // Try to use ship's name as a basic health check
      await api.getOurName();
      console.log("Connection verified");
    } catch (connErr) {
      console.error("Connection check failed:", connErr);
      console.log("Attempting to reconnect...");
      
      // Re-authenticate
      try {
        await api.connect();
        console.log("Successfully reconnected");
      } catch (reconnErr) {
        console.error("Reconnection failed:", reconnErr);
        throw new Error("Connection to ship lost and reconnection failed");
      }
    }
  
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
    
    console.log(`Sending message via poke to ${toShip}...`);
    
    await api.poke({
      app: "chat",
      mark: "chat-dm-action",
      json: action,
      onError: (e) => {
        console.error("Poke error:", e);
        throw e;
      }
    });
    
    console.log("DM sent successfully!");
    // Return message and recipient in the content array format FastMCP expects
    return {
      content: [
        { type: "text", text: `Message sent to ${toShip}` }
      ]
    };
  } catch (error) {
    console.error("Error sending DM:", error);
    let errorMessage = error.message || "Unknown error occurred";
    
    if (errorMessage.includes("PUT channel")) {
      errorMessage = `Failed to communicate with the ship. Please verify:
1. Your ship is still running at ${api.url}
2. You have the 'chat' app installed and running
3. The recipient (${toShip}) is valid and can receive DMs
4. Try restarting the server if the issue persists`;
    }
    
    return { 
      content: [
        { type: "text", text: `Error: ${errorMessage}` }
      ]
    };
  }
}

/**
 * Set up and run the MCP server with the send-dm tool
 */
async function startMcpServer() {
  const config = getConfig();
  const shipName = `~${config.ship}`;
  
  console.log(`Setting up MCP server for Tlon at ${config.url}`);
  console.log(`Authenticating as ${shipName}`);
  
  let api;
  try {
    api = await Urbit.authenticate({
      ship: config.ship,
      url: config.url,
      code: config.code,
      verbose: true,
    });
    
    // Set a longer timeout value for API calls
    api.requestTimeout = 30000; // 30 seconds
    
    console.log("Successfully authenticated to ship");
  } catch (error) {
    console.error("Failed to authenticate to ship:", error);
    if (error.message && error.message.includes("PUT channel")) {
      console.error("-----------------------------------------------------");
      console.error("Authentication Error: Failed to PUT channel");
      console.error("Check the following:");
      console.error(`1. Is your Urbit ship (${shipName}) running at ${config.url}?`);
      console.error(`2. Is the +code (${config.code}) correct?`);
      console.error(`3. Try accessing ${config.url} in a browser to verify connectivity`);
      console.error("-----------------------------------------------------");
    }
    process.exit(1);
  }

  // Create and configure the MCP server
  const server = new FastMCP({
    name: "Tlon MCP Server", 
    version: "0.0.1",
  });

  // Add send-dm tool
  server.addTool({
    name: "send-dm",
    description: "Send a direct message to another ship",
    parameters: z.object({
      recipient: z.string().describe("Recipient ship name (with or without ~)"),
      message: z.string().describe("Message text to send")
    }),
    execute: async (params) => {
      // Clean recipient (remove ~ if present)
      const recipient = `~${params.recipient.replace(/^~/, '')}`;
      
      try {
        const result = await sendDm(api, shipName, recipient, params.message);
        return result;
      } catch (error) {
        console.error("Error sending DM:", error);
        return { 
          content: [
            { type: "text", text: `Error: ${error.message || "Unknown error occurred"}` }
          ]
        };
      }
    }
  });

  // Start the server with a basic default configuration
  // Use HTTP transport only if explicitly requested, otherwise default to stdio
  const useHttp = process.env.MCP_TRANSPORT === "http";
  const port = parseInt(process.env.PORT || "3001");
  
  try {
    if (useHttp) {
      // Set up SSE transport according to the documentation
      await server.start({
        transportType: "sse",
        sse: {
          endpoint: "/sse",
          port
        }
      });
      console.log(`Tlon MCP server started on port ${port}, endpoint: /sse`);
    } else {
      // Default to stdio with no options
      await server.start({
        transportType: "stdio"
      });
      console.log("Tlon MCP server started in stdio mode");
    }
  } catch (error) {
    console.error("Error starting MCP server:", error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down MCP server...');
    try {
      await server.stop();
      await api.delete();
    } catch (e) {
      console.warn("Warning: Failed to clean up resources", e);
    }
    process.exit(0);
  });
}

// Start the MCP server when this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// Export for use as a module in other scripts
export {
  sendDm,
  startMcpServer
};
