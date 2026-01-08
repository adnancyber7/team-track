import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// WebSocket-based real-time sync server
// Broadcasts all agent actions instantly to all connected clients

const clients = new Set();
let clientIdCounter = 0;

Deno.serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientId = ++clientIdCounter;
  
  socket.onopen = () => {
    clients.add({ id: clientId, socket });
    console.log(`[WebSocket] Client ${clientId} connected. Total: ${clients.size}`);
    
    // Send welcome message
    socket.send(JSON.stringify({ 
      type: 'connected', 
      clientId, 
      totalClients: clients.size,
      timestamp: Date.now()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`[WebSocket] Client ${clientId} sent:`, message.type);

      // Broadcast to all OTHER clients (exclude sender)
      const broadcast = {
        ...message,
        from: clientId,
        timestamp: Date.now()
      };

      let broadcastCount = 0;
      for (const client of clients) {
        if (client.id !== clientId && client.socket.readyState === WebSocket.OPEN) {
          try {
            client.socket.send(JSON.stringify(broadcast));
            broadcastCount++;
          } catch (e) {
            console.error(`Failed to send to client ${client.id}:`, e);
          }
        }
      }

      console.log(`[WebSocket] Broadcasted ${message.type} to ${broadcastCount} clients`);

      // Send acknowledgment to sender
      socket.send(JSON.stringify({ 
        type: 'ack', 
        originalType: message.type,
        broadcastCount,
        timestamp: Date.now()
      }));

    } catch (e) {
      console.error('[WebSocket] Message parse error:', e);
    }
  };

  socket.onclose = () => {
    clients.delete([...clients].find(c => c.id === clientId));
    console.log(`[WebSocket] Client ${clientId} disconnected. Remaining: ${clients.size}`);
  };

  socket.onerror = (e) => {
    console.error(`[WebSocket] Client ${clientId} error:`, e);
  };

  return response;
});