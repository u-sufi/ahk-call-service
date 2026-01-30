# FreeSWITCH Backend Code Examples

Complete code examples for implementing inbound/outbound calling.

---

## Node.js Implementation

### 1. ESL Client (esl-client.js)

```javascript
const esl = require('modesl');

class FreeSwitchClient {
    constructor() {
        this.host = process.env.FS_HOST || '157.173.117.207';
        this.port = process.env.FS_ESL_PORT || 18443;
        this.password = process.env.FS_ESL_PASSWORD;
        this.connection = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.connection = new esl.Connection(
                this.host,
                this.port,
                this.password,
                () => {
                    console.log('Connected to FreeSWITCH');
                    resolve(this.connection);
                }
            );

            this.connection.on('error', (err) => {
                console.error('ESL Error:', err);
                reject(err);
            });
        });
    }

    async sendCommand(command) {
        return new Promise((resolve, reject) => {
            this.connection.api(command, (response) => {
                const body = response.getBody();
                if (body.includes('-ERR')) {
                    reject(new Error(body));
                } else {
                    resolve(body);
                }
            });
        });
    }

    // Reload XML configuration
    async reloadXml() {
        return this.sendCommand('reloadxml');
    }

    // Check if extension is registered (online)
    async isExtensionOnline(extension) {
        const result = await this.sendCommand('sofia status profile internal reg');
        return result.includes(`${extension}@`);
    }

    // Get all registered extensions
    async getRegistrations() {
        return this.sendCommand('sofia status profile internal reg');
    }

    // Make outbound call (click-to-call)
    async dialOut(agentExtension, destination, callerIdNumber, callerIdName) {
        const cmd = `originate {origination_caller_id_number=${callerIdNumber},origination_caller_id_name=${callerIdName || 'Outbound'}}user/${agentExtension}@$\${domain} &bridge(sofia/gateway/telnyx/${destination})`;
        return this.sendCommand(cmd);
    }

    // Hang up a call
    async hangup(uuid) {
        return this.sendCommand(`uuid_kill ${uuid}`);
    }

    // Transfer a call
    async transfer(uuid, destination) {
        return this.sendCommand(`uuid_transfer ${uuid} ${destination}`);
    }

    // Get active calls
    async getActiveCalls() {
        return this.sendCommand('show calls');
    }

    // Subscribe to events for CDR
    subscribeToEvents() {
        this.connection.subscribe('CHANNEL_HANGUP_COMPLETE');
    }

    // Event handler
    onCallEnd(callback) {
        this.connection.on('esl::event::CHANNEL_HANGUP_COMPLETE::*', (event) => {
            const cdr = {
                uuid: event.getHeader('Unique-ID'),
                caller_id_name: event.getHeader('Caller-Caller-ID-Name'),
                caller_id_number: event.getHeader('Caller-Caller-ID-Number'),
                destination_number: event.getHeader('Caller-Destination-Number'),
                start_time: event.getHeader('variable_start_stamp'),
                answer_time: event.getHeader('variable_answer_stamp'),
                end_time: event.getHeader('variable_end_stamp'),
                duration: parseInt(event.getHeader('variable_duration') || '0'),
                billsec: parseInt(event.getHeader('variable_billsec') || '0'),
                hangup_cause: event.getHeader('Hangup-Cause'),
                direction: event.getHeader('Call-Direction')
            };
            callback(cdr);
        });
    }
}

module.exports = new FreeSwitchClient();
```

### 2. XML Writer (xml-writer.js)

```javascript
const fs = require('fs').promises;
const path = require('path');

const FS_CONF_DIR = '/usr/local/freeswitch/conf';

class XmlWriter {
    
    // Generate agent/extension XML
    generateAgentXml(data) {
        return `<include>
  <user id="${data.extension}">
    <params>
      <param name="password" value="${data.password}"/>
      <param name="vm-password" value="${data.extension}"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international,local"/>
      <variable name="accountcode" value="${data.extension}"/>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="${data.caller_id_name || data.name}"/>
      <variable name="effective_caller_id_number" value="${data.caller_id_number || data.extension}"/>
      <variable name="outbound_caller_id_name" value="$\${outbound_caller_name}"/>
      <variable name="outbound_caller_id_number" value="$\${outbound_caller_id}"/>
      <variable name="callgroup" value="agents"/>
      <variable name="media_webrtc" value="true"/>
      <variable name="rtp_secure_media" value="true"/>
      <variable name="rtp_secure_media_inbound" value="true"/>
      <variable name="rtp_secure_media_outbound" value="true"/>
      <variable name="sip_secure_media" value="true"/>
    </variables>
  </user>
</include>`;
    }

    async writeAgent(data) {
        const filePath = path.join(FS_CONF_DIR, 'directory', 'default', `${data.extension}.xml`);
        const xml = this.generateAgentXml(data);
        await fs.writeFile(filePath, xml, 'utf8');
        return filePath;
    }

    async deleteAgent(extension) {
        const filePath = path.join(FS_CONF_DIR, 'directory', 'default', `${extension}.xml`);
        try {
            await fs.unlink(filePath);
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }
    }

    // Generate inbound route XML
    generateInboundRouteXml(data) {
        // Escape + for regex
        const escapedDid = data.did_number.replace(/\+/g, '\\+');
        
        return `<include>
  <extension name="inbound_${data.did_number.replace(/[^0-9]/g, '')}">
    <condition field="destination_number" expression="^(\\+?${escapedDid.replace(/^\\\+/, '')})$">
      <action application="set" data="domain_name=$\${domain}"/>
      <action application="transfer" data="${data.destination_extension} XML default"/>
    </condition>
  </extension>
</include>`;
    }

    async writeInboundRoute(data) {
        const safeName = data.did_number.replace(/[^0-9]/g, '');
        const filePath = path.join(FS_CONF_DIR, 'dialplan', 'public', `inbound_${safeName}.xml`);
        const xml = this.generateInboundRouteXml(data);
        await fs.writeFile(filePath, xml, 'utf8');
        return filePath;
    }

    async deleteInboundRoute(didNumber) {
        const safeName = didNumber.replace(/[^0-9]/g, '');
        const filePath = path.join(FS_CONF_DIR, 'dialplan', 'public', `inbound_${safeName}.xml`);
        try {
            await fs.unlink(filePath);
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }
    }
}

module.exports = new XmlWriter();
```

### 3. Express Routes (routes/agents.js)

```javascript
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const fsClient = require('../utils/esl-client');
const xmlWriter = require('../utils/xml-writer');

// Generate secure password
function generatePassword(length = 24) {
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

// List all agents
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, extension, name, email, is_active, created_at FROM agents WHERE is_active = true ORDER BY extension');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single agent
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT id, extension, name, email, caller_id_name, caller_id_number, is_active FROM agents WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create agent
router.post('/', async (req, res) => {
    try {
        const { extension, name, email, caller_id_name, caller_id_number } = req.body;

        // Validate extension
        if (!/^[0-9]{4,6}$/.test(extension)) {
            return res.status(400).json({ success: false, error: 'Extension must be 4-6 digits' });
        }

        // Check if extension exists
        const existing = await db.query('SELECT id FROM agents WHERE extension = $1', [extension]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Extension already exists' });
        }

        // Generate password
        const password = generatePassword();
        const id = uuidv4();

        // Save to database
        await db.query(
            'INSERT INTO agents (id, extension, password, name, email, caller_id_name, caller_id_number) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, extension, password, name, email, caller_id_name || name, caller_id_number || extension]
        );

        // Write XML file
        await xmlWriter.writeAgent({
            extension,
            password,
            name,
            caller_id_name: caller_id_name || name,
            caller_id_number: caller_id_number || extension
        });

        // Reload FreeSWITCH
        await fsClient.reloadXml();

        // Return credentials
        res.status(201).json({
            success: true,
            data: {
                id,
                extension,
                name,
                credentials: {
                    username: extension,
                    password: password,
                    domain: process.env.FS_HOST || '157.173.117.207',
                    websocket_url: `wss://${process.env.FS_HOST || '157.173.117.207'}:7443`,
                    sip_server: process.env.FS_HOST || '157.173.117.207',
                    sip_port: 5062
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get agent credentials
router.get('/:id/credentials', async (req, res) => {
    try {
        const result = await db.query('SELECT extension, password FROM agents WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
        }

        const agent = result.rows[0];
        res.json({
            success: true,
            data: {
                username: agent.extension,
                password: agent.password,
                domain: process.env.FS_HOST || '157.173.117.207',
                websocket_url: `wss://${process.env.FS_HOST || '157.173.117.207'}:7443`,
                sip_server: process.env.FS_HOST || '157.173.117.207',
                sip_port: 5062,
                stun_server: 'stun:stun.l.google.com:19302'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check agent online status
router.get('/:id/status', async (req, res) => {
    try {
        const result = await db.query('SELECT extension FROM agents WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
        }

        const extension = result.rows[0].extension;
        const online = await fsClient.isExtensionOnline(extension);

        res.json({
            success: true,
            data: {
                extension,
                online
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete agent
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT extension FROM agents WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
        }

        const extension = result.rows[0].extension;

        // Soft delete in DB
        await db.query('UPDATE agents SET is_active = false WHERE id = $1', [req.params.id]);

        // Delete XML file
        await xmlWriter.deleteAgent(extension);

        // Reload FreeSWITCH
        await fsClient.reloadXml();

        res.json({ success: true, message: 'Agent deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

### 4. Express Routes (routes/inbound-routes.js)

```javascript
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const fsClient = require('../utils/esl-client');
const xmlWriter = require('../utils/xml-writer');

// List all inbound routes
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM inbound_routes WHERE is_active = true ORDER BY did_number');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create inbound route
router.post('/', async (req, res) => {
    try {
        const { did_number, destination_extension, description } = req.body;

        // Validate
        if (!did_number || !destination_extension) {
            return res.status(400).json({ success: false, error: 'did_number and destination_extension are required' });
        }

        // Check if route exists
        const existing = await db.query('SELECT id FROM inbound_routes WHERE did_number = $1', [did_number]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Route for this DID already exists' });
        }

        // Check if destination extension exists
        const agent = await db.query('SELECT id FROM agents WHERE extension = $1 AND is_active = true', [destination_extension]);
        if (agent.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Destination extension does not exist' });
        }

        const id = uuidv4();

        // Save to database
        await db.query(
            'INSERT INTO inbound_routes (id, did_number, destination_extension, description) VALUES ($1, $2, $3, $4)',
            [id, did_number, destination_extension, description]
        );

        // Write XML file
        await xmlWriter.writeInboundRoute({
            did_number,
            destination_extension
        });

        // Reload FreeSWITCH
        await fsClient.reloadXml();

        res.status(201).json({
            success: true,
            data: {
                id,
                did_number,
                destination_extension,
                description
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update inbound route
router.put('/:id', async (req, res) => {
    try {
        const { destination_extension, description } = req.body;

        const existing = await db.query('SELECT * FROM inbound_routes WHERE id = $1', [req.params.id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Route not found' });
        }

        const route = existing.rows[0];

        // Update database
        await db.query(
            'UPDATE inbound_routes SET destination_extension = $1, description = $2 WHERE id = $3',
            [destination_extension || route.destination_extension, description || route.description, req.params.id]
        );

        // Rewrite XML file
        await xmlWriter.writeInboundRoute({
            did_number: route.did_number,
            destination_extension: destination_extension || route.destination_extension
        });

        // Reload FreeSWITCH
        await fsClient.reloadXml();

        res.json({ success: true, message: 'Route updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete inbound route
router.delete('/:id', async (req, res) => {
    try {
        const existing = await db.query('SELECT did_number FROM inbound_routes WHERE id = $1', [req.params.id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Route not found' });
        }

        const didNumber = existing.rows[0].did_number;

        // Delete from database
        await db.query('DELETE FROM inbound_routes WHERE id = $1', [req.params.id]);

        // Delete XML file
        await xmlWriter.deleteInboundRoute(didNumber);

        // Reload FreeSWITCH
        await fsClient.reloadXml();

        res.json({ success: true, message: 'Route deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

### 5. Express Routes (routes/calls.js)

```javascript
const express = require('express');
const router = express.Router();
const db = require('../db');
const fsClient = require('../utils/esl-client');

// Default caller ID (your DID)
const DEFAULT_CALLER_ID = process.env.DEFAULT_CALLER_ID || '+19495431333';
const DEFAULT_CALLER_NAME = process.env.DEFAULT_CALLER_NAME || 'Outbound Call';

// Initiate outbound call (click-to-call)
router.post('/dial', async (req, res) => {
    try {
        const { agent_extension, destination, caller_id_number, caller_id_name } = req.body;

        // Validate
        if (!agent_extension || !destination) {
            return res.status(400).json({ success: false, error: 'agent_extension and destination are required' });
        }

        // Check if agent exists and is online
        const agent = await db.query('SELECT id FROM agents WHERE extension = $1 AND is_active = true', [agent_extension]);
        if (agent.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Agent not found' });
        }

        const isOnline = await fsClient.isExtensionOnline(agent_extension);
        if (!isOnline) {
            return res.status(400).json({ success: false, error: 'Agent is not online' });
        }

        // Format destination number
        let formattedDest = destination.replace(/[^0-9+]/g, '');
        if (!formattedDest.startsWith('+')) {
            // Assume US number if no +
            if (formattedDest.length === 10) {
                formattedDest = '+1' + formattedDest;
            } else if (formattedDest.length === 11 && formattedDest.startsWith('1')) {
                formattedDest = '+' + formattedDest;
            }
        }

        // Make the call
        const result = await fsClient.dialOut(
            agent_extension,
            formattedDest,
            caller_id_number || DEFAULT_CALLER_ID,
            caller_id_name || DEFAULT_CALLER_NAME
        );

        // Extract UUID from result if available
        const uuidMatch = result.match(/([a-f0-9-]{36})/i);
        const uuid = uuidMatch ? uuidMatch[1] : null;

        res.json({
            success: true,
            data: {
                uuid,
                status: 'calling_agent',
                agent_extension,
                destination: formattedDest
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Hang up call
router.post('/:uuid/hangup', async (req, res) => {
    try {
        await fsClient.hangup(req.params.uuid);
        res.json({ success: true, message: 'Call hung up' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Transfer call
router.post('/:uuid/transfer', async (req, res) => {
    try {
        const { destination } = req.body;
        if (!destination) {
            return res.status(400).json({ success: false, error: 'destination is required' });
        }

        await fsClient.transfer(req.params.uuid, destination);
        res.json({ success: true, message: 'Call transferred' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get active calls
router.get('/active', async (req, res) => {
    try {
        const result = await fsClient.getActiveCalls();
        // Parse the result (it's a text table)
        // For simplicity, return raw result
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

### 6. CDR Handler (cdr-handler.js)

```javascript
const db = require('../db');
const fsClient = require('../utils/esl-client');

async function startCdrHandler() {
    // Subscribe to call end events
    fsClient.subscribeToEvents();

    // Handle each call end
    fsClient.onCallEnd(async (cdr) => {
        try {
            await db.query(
                `INSERT INTO call_records 
                (uuid, caller_id_name, caller_id_number, destination_number, direction, 
                 start_time, answer_time, end_time, duration, billsec, hangup_cause)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (uuid) DO NOTHING`,
                [
                    cdr.uuid,
                    cdr.caller_id_name,
                    cdr.caller_id_number,
                    cdr.destination_number,
                    cdr.direction || 'unknown',
                    cdr.start_time,
                    cdr.answer_time,
                    cdr.end_time,
                    cdr.duration,
                    cdr.billsec,
                    cdr.hangup_cause
                ]
            );
            console.log(`CDR saved: ${cdr.uuid}`);
        } catch (error) {
            console.error('Error saving CDR:', error);
        }
    });

    console.log('CDR handler started');
}

module.exports = { startCdrHandler };
```

### 7. Main App (app.js)

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fsClient = require('./utils/esl-client');
const { startCdrHandler } = require('./utils/cdr-handler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/agents', require('./routes/agents'));
app.use('/api/inbound-routes', require('./routes/inbound-routes'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/cdr', require('./routes/cdr'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
    try {
        // Connect to FreeSWITCH
        await fsClient.connect();
        console.log('Connected to FreeSWITCH');

        // Start CDR handler
        startCdrHandler();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start:', error);
        process.exit(1);
    }
}

start();
```

### 8. Environment Variables (.env)

```bash
# FreeSWITCH Connection
FS_HOST=157.173.117.207
FS_ESL_PORT=18443
FS_ESL_PASSWORD=your_esl_password_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pbx

# Default Caller ID (your DID)
DEFAULT_CALLER_ID=+19495431333
DEFAULT_CALLER_NAME=My Company

# Server
PORT=3000
```

### 9. Package.json

```json
{
  "name": "freeswitch-backend",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "modesl": "^1.1.4",
    "pg": "^8.11.3",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 10. Database Connection (db.js)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

module.exports = {
    query: (text, params) => pool.query(text, params)
};
```

---

## Quick Test Commands

```bash
# 1. Create an agent
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"extension": "1020", "name": "Test Agent", "email": "test@example.com"}'

# 2. Get agent credentials (for WebRTC client)
curl http://localhost:3000/api/agents/{agent-id}/credentials

# 3. Check if agent is online
curl http://localhost:3000/api/agents/{agent-id}/status

# 4. Create inbound route
curl -X POST http://localhost:3000/api/inbound-routes \
  -H "Content-Type: application/json" \
  -d '{"did_number": "+19495431333", "destination_extension": "1020"}'

# 5. Make outbound call
curl -X POST http://localhost:3000/api/calls/dial \
  -H "Content-Type: application/json" \
  -d '{"agent_extension": "1020", "destination": "+18005551234"}'

# 6. Get call records
curl http://localhost:3000/api/cdr
```

---

## WebRTC Client Configuration

When connecting a WebRTC client (like JsSIP or SIP.js), use these settings:

```javascript
const config = {
    uri: 'sip:1020@157.173.117.207',
    password: 'agent_password_from_api',
    wsServers: 'wss://157.173.117.207:7443',
    register: true,
    
    // SRTP settings (required)
    rtcpMuxPolicy: 'require',
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};
```

---

*Code Examples Version: 2.0 (Simplified)*
*Last Updated: January 14, 2026*
