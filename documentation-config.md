# FreeSWITCH Backend API Documentation

## Simple Guide for Inbound/Outbound Calling

This document provides everything needed to build a backend that enables **inbound and outbound calling** using your shared FreeSWITCH server.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [What You Need to Set Up](#what-you-need-to-set-up)
3. [Database Schema](#database-schema)
4. [FreeSWITCH Connection](#freeswitch-connection)
5. [API Modules](#api-modules)
   - [Agents/Extensions Module](#1-agentsextensions-module)
   - [Inbound Routes Module](#2-inbound-routes-module)
   - [Outbound Calling Module](#3-outbound-calling-module)
   - [Call Records (CDR) Module](#4-call-records-cdr-module)
6. [Quick Start Checklist](#quick-start-checklist)

---

## Architecture Overview

```
┌─────────────────┐                    ┌─────────────────┐
│   Your Backend  │◄──── REST API ────►│   Your Frontend │
│   (Clone)       │                    │   (WebRTC/App)  │
└────────┬────────┘                    └─────────────────┘
         │
         │ ESL (Event Socket)
         │ Port 18443
         ▼
┌─────────────────────────────────────────────────────────┐
│              SHARED FREESWITCH SERVER                   │
│                  157.173.117.207                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Extensions │  │   Gateway   │  │  Dialplan   │     │
│  │  (Agents)   │  │  (Telnyx)   │  │  (Routes)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
         │
         │ SIP Trunk
         ▼
┌─────────────────┐
│  Telnyx/Carrier │ ◄── Inbound DIDs / Outbound Calls
└─────────────────┘
```

### How It Works

1. **Your Backend** connects to FreeSWITCH via ESL (Event Socket Layer)
2. **Agents** register to FreeSWITCH (via WebRTC or SIP phone)
3. **Inbound Calls**: DID → FreeSWITCH → Routes to your agent
4. **Outbound Calls**: Your backend tells FreeSWITCH to dial out via gateway

---

## What You Need to Set Up

For basic inbound/outbound calling, you only need:

| Component | Purpose | Required? |
|-----------|---------|-----------|
| **Agents/Extensions** | People who make/receive calls | ✅ Yes |
| **Inbound Routes** | Route incoming DID calls to agents | ✅ Yes (for inbound) |
| **Gateway** | Already configured (Telnyx) | ✅ Already done |
| **Outbound Routes** | Already configured | ✅ Already done |

### Already Configured on FreeSWITCH

- ✅ **Telnyx Gateway** - For outbound calls
- ✅ **Outbound Routes** - US, International, E.164 patterns
- ✅ **WebRTC Support** - WSS on port 7443
- ✅ **SIP Support** - Port 5062 (internal)

### What Your Backend Needs to Do

1. **Create agents** (extensions) - so people can log in
2. **Set up inbound routes** - so incoming calls reach the right agent
3. **Initiate outbound calls** - click-to-call functionality
4. **Track call records** - for reporting/billing

---

## Database Schema

### Simple Schema (Only What You Need)

```sql
-- Agents (people who make/receive calls)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension VARCHAR(10) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    caller_id_name VARCHAR(100),
    caller_id_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inbound Routes (which DID goes to which agent)
CREATE TABLE inbound_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    did_number VARCHAR(20) NOT NULL UNIQUE,
    destination_extension VARCHAR(10) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call Records (CDR)
CREATE TABLE call_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid VARCHAR(100) NOT NULL UNIQUE,
    caller_id_name VARCHAR(100),
    caller_id_number VARCHAR(50),
    destination_number VARCHAR(50),
    direction VARCHAR(20), -- 'inbound' or 'outbound'
    start_time TIMESTAMP,
    answer_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INT DEFAULT 0,
    billsec INT DEFAULT 0,
    hangup_cause VARCHAR(50),
    recording_path VARCHAR(500),
    agent_extension VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Agent Status (online/offline tracking)
CREATE TABLE agent_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    status VARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'busy', 'away'
    registered_at TIMESTAMP,
    last_seen TIMESTAMP
);
```

---

## FreeSWITCH Connection

### ESL Connection Details

```javascript
const ESL_CONFIG = {
    host: '157.173.117.207',  // FreeSWITCH server IP
    port: 18443,               // ESL port
    password: 'YOUR_ESL_PASSWORD'  // Get from event_socket.conf.xml
};
```

### Agent Connection Details (for WebRTC/SIP clients)

```javascript
const AGENT_CONFIG = {
    // For WebRTC (browser-based)
    websocket_url: 'wss://157.173.117.207:7443',
    
    // For SIP phones
    sip_server: '157.173.117.207',
    sip_port: 5062,
    
    // Domain
    domain: '157.173.117.207'
};
```

---

## API Modules

---

## 1. Agents/Extensions Module

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get single agent |
| POST | `/api/agents` | Create new agent |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |
| GET | `/api/agents/:id/status` | Check if agent is online |
| GET | `/api/agents/:id/credentials` | Get SIP/WebRTC credentials |

### Create Agent

**POST `/api/agents`**

**Request Payload:**

```json
{
    "extension": "1020",
    "name": "John Doe",
    "email": "john@example.com",
    "caller_id_name": "John Doe",
    "caller_id_number": "1020"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `extension` | string | Yes | Unique extension number (e.g., "1020", "1021"). Use 1020+ to avoid conflicts with existing 1000-1019. |
| `name` | string | Yes | Agent's display name |
| `email` | string | No | Agent's email (for notifications) |
| `caller_id_name` | string | No | Name shown on outbound calls. Default: agent name |
| `caller_id_number` | string | No | Number shown on outbound calls. Default: extension |

**What Your Backend Does:**

1. Generate secure random password
2. Save to database
3. Write XML file to FreeSWITCH
4. Reload FreeSWITCH config

**XML to Generate:**

File: `/usr/local/freeswitch/conf/directory/default/{extension}.xml`

```xml
<include>
  <user id="{extension}">
    <params>
      <param name="password" value="{generated_password}"/>
      <param name="vm-password" value="{extension}"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international,local"/>
      <variable name="accountcode" value="{extension}"/>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="{caller_id_name}"/>
      <variable name="effective_caller_id_number" value="{caller_id_number}"/>
      <variable name="outbound_caller_id_name" value="$${outbound_caller_name}"/>
      <variable name="outbound_caller_id_number" value="$${outbound_caller_id}"/>
      <variable name="callgroup" value="agents"/>
      <!-- WebRTC Support -->
      <variable name="media_webrtc" value="true"/>
      <variable name="rtp_secure_media" value="true"/>
      <variable name="rtp_secure_media_inbound" value="true"/>
      <variable name="rtp_secure_media_outbound" value="true"/>
      <variable name="sip_secure_media" value="true"/>
    </variables>
  </user>
</include>
```

**ESL Command After Creation:**

```
reloadxml
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": "uuid-here",
        "extension": "1020",
        "name": "John Doe",
        "credentials": {
            "username": "1020",
            "password": "generated_secure_password",
            "domain": "157.173.117.207",
            "websocket_url": "wss://157.173.117.207:7443",
            "sip_server": "157.173.117.207",
            "sip_port": 5062
        }
    }
}
```

### Get Agent Credentials

**GET `/api/agents/:id/credentials`**

Returns the credentials needed for WebRTC/SIP client to connect:

```json
{
    "success": true,
    "data": {
        "username": "1020",
        "password": "the_password",
        "domain": "157.173.117.207",
        "websocket_url": "wss://157.173.117.207:7443",
        "sip_server": "157.173.117.207",
        "sip_port": 5062,
        "stun_server": "stun:stun.l.google.com:19302"
    }
}
```

### Check Agent Online Status

**GET `/api/agents/:id/status`**

**ESL Command:**
```
sofia status profile internal reg
```

Parse the output to find if the extension is registered.

**Response:**

```json
{
    "success": true,
    "data": {
        "extension": "1020",
        "online": true,
        "registered_from": "192.168.1.100",
        "user_agent": "JsSIP"
    }
}
```

---

## 2. Inbound Routes Module

Routes incoming calls from your DIDs to agents.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inbound-routes` | List all routes |
| POST | `/api/inbound-routes` | Create route |
| PUT | `/api/inbound-routes/:id` | Update route |
| DELETE | `/api/inbound-routes/:id` | Delete route |

### Create Inbound Route

**POST `/api/inbound-routes`**

**Request Payload:**

```json
{
    "did_number": "+19495431333",
    "destination_extension": "1020",
    "description": "Main sales line"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `did_number` | string | Yes | The DID number (from Telnyx). Include + for E.164 format. |
| `destination_extension` | string | Yes | Agent extension to ring when this DID is called |
| `description` | string | No | Human-readable description |

**XML to Generate:**

File: `/usr/local/freeswitch/conf/dialplan/public/inbound_{safe_did}.xml`

```xml
<include>
  <extension name="inbound_{did_number}">
    <condition field="destination_number" expression="^(\+?19495431333)$">
      <action application="set" data="domain_name=$${domain}"/>
      <action application="transfer" data="{destination_extension} XML default"/>
    </condition>
  </extension>
</include>
```

**ESL Command After Creation:**

```
reloadxml
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": "uuid-here",
        "did_number": "+19495431333",
        "destination_extension": "1020",
        "description": "Main sales line"
    }
}
```

### How Inbound Calls Work

1. Someone calls your DID (+19495431333)
2. Telnyx sends the call to FreeSWITCH (port 5080)
3. FreeSWITCH matches the DID in `dialplan/public/`
4. Call transfers to the agent's extension
5. Agent's phone/WebRTC rings
6. Agent answers → call connected

---

## 3. Outbound Calling Module

Make outbound calls (click-to-call functionality).

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calls/dial` | Initiate outbound call |
| POST | `/api/calls/:uuid/hangup` | Hang up a call |
| POST | `/api/calls/:uuid/transfer` | Transfer a call |
| GET | `/api/calls/active` | List active calls |

### Initiate Outbound Call (Click-to-Call)

**POST `/api/calls/dial`**

**Request Payload:**

```json
{
    "agent_extension": "1020",
    "destination": "+18005551234",
    "caller_id_number": "+19495431333",
    "caller_id_name": "My Company"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_extension` | string | Yes | The agent making the call |
| `destination` | string | Yes | Number to dial. Can be: `+18005551234`, `18005551234`, `8005551234` |
| `caller_id_number` | string | No | Caller ID to show. Default: your DID |
| `caller_id_name` | string | No | Caller ID name to show |

**ESL Command to Execute:**

```
originate {origination_caller_id_number=+19495431333,origination_caller_id_name=My Company}user/1020@$${domain} &bridge(sofia/gateway/telnyx/+18005551234)
```

**How Click-to-Call Works:**

1. Your backend receives the dial request
2. Backend sends ESL `originate` command to FreeSWITCH
3. FreeSWITCH first calls the agent (extension 1020)
4. When agent answers, FreeSWITCH dials out via Telnyx gateway
5. When destination answers, both legs are bridged

**Response:**

```json
{
    "success": true,
    "data": {
        "uuid": "call-uuid-here",
        "status": "calling_agent",
        "agent_extension": "1020",
        "destination": "+18005551234"
    }
}
```

### Hang Up Call

**POST `/api/calls/:uuid/hangup`**

**ESL Command:**
```
uuid_kill {uuid}
```

### Transfer Call

**POST `/api/calls/:uuid/transfer`**

**Request Payload:**

```json
{
    "destination": "1021"
}
```

**ESL Command:**
```
uuid_transfer {uuid} {destination}
```

### List Active Calls

**GET `/api/calls/active`**

**ESL Command:**
```
show calls
```

Parse the output and return:

```json
{
    "success": true,
    "data": [
        {
            "uuid": "abc-123",
            "caller": "+18005551234",
            "destination": "1020",
            "duration": 125,
            "direction": "inbound"
        }
    ]
}
```

---

## 4. Call Records (CDR) Module

Track all calls for reporting and billing.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cdr` | List call records (with filters) |
| GET | `/api/cdr/:id` | Get single call record |
| GET | `/api/cdr/stats` | Get call statistics |

### How to Capture CDR

Subscribe to FreeSWITCH events via ESL:

```javascript
// Subscribe to hangup events
connection.subscribe('CHANNEL_HANGUP_COMPLETE');

// Handle each call end
connection.on('esl::event::CHANNEL_HANGUP_COMPLETE::*', (event) => {
    const cdr = {
        uuid: event.getHeader('Unique-ID'),
        caller_id_name: event.getHeader('Caller-Caller-ID-Name'),
        caller_id_number: event.getHeader('Caller-Caller-ID-Number'),
        destination_number: event.getHeader('Caller-Destination-Number'),
        start_time: event.getHeader('variable_start_stamp'),
        answer_time: event.getHeader('variable_answer_stamp'),
        end_time: event.getHeader('variable_end_stamp'),
        duration: event.getHeader('variable_duration'),
        billsec: event.getHeader('variable_billsec'),
        hangup_cause: event.getHeader('Hangup-Cause'),
        direction: event.getHeader('variable_direction')
    };
    
    // Save to database
    saveCdrToDatabase(cdr);
});
```

### List Call Records

**GET `/api/cdr`**

**Query Parameters:**

| Param | Description |
|-------|-------------|
| `from` | Start date (ISO format) |
| `to` | End date (ISO format) |
| `agent_extension` | Filter by agent |
| `direction` | `inbound` or `outbound` |
| `limit` | Number of records |
| `offset` | Pagination offset |

**Response:**

```json
{
    "success": true,
    "data": {
        "total": 150,
        "records": [
            {
                "id": "uuid",
                "caller_id_number": "+18005551234",
                "destination_number": "1020",
                "direction": "inbound",
                "start_time": "2026-01-14T10:30:00Z",
                "duration": 180,
                "billsec": 165,
                "hangup_cause": "NORMAL_CLEARING",
                "agent_extension": "1020"
            }
        ]
    }
}
```

### Get Call Statistics

**GET `/api/cdr/stats`**

**Query Parameters:** `from`, `to`, `agent_extension`

**Response:**

```json
{
    "success": true,
    "data": {
        "total_calls": 150,
        "inbound_calls": 80,
        "outbound_calls": 70,
        "answered_calls": 120,
        "missed_calls": 30,
        "total_duration": 18000,
        "average_duration": 150,
        "by_agent": [
            {
                "extension": "1020",
                "name": "John Doe",
                "total_calls": 50,
                "total_duration": 6000
            }
        ]
    }
}
```

---

## Quick Start Checklist

### 1. Set Up Your Backend

```bash
# Clone your backend repo
git clone your-backend-repo
cd your-backend

# Install dependencies
npm install  # or pip install -r requirements.txt

# Set environment variables
export FS_HOST=157.173.117.207
export FS_ESL_PORT=18443
export FS_ESL_PASSWORD=your_password
export DATABASE_URL=your_database_url
```

### 2. Create Database Tables

Run the SQL schema from above.

### 3. Implement Core Functions

```javascript
// 1. ESL Connection
const esl = require('modesl');
const connection = new esl.Connection(FS_HOST, FS_ESL_PORT, FS_ESL_PASSWORD);

// 2. Reload XML after changes
async function reloadXml() {
    return new Promise((resolve) => {
        connection.api('reloadxml', resolve);
    });
}

// 3. Write agent XML file
async function createAgentXml(extension, password, callerIdName) {
    const xml = `<include>
  <user id="${extension}">
    <params>
      <param name="password" value="${password}"/>
      <param name="vm-password" value="${extension}"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international,local"/>
      <variable name="accountcode" value="${extension}"/>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="${callerIdName}"/>
      <variable name="effective_caller_id_number" value="${extension}"/>
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
    
    await fs.writeFile(`/usr/local/freeswitch/conf/directory/default/${extension}.xml`, xml);
    await reloadXml();
}

// 4. Make outbound call
async function dialOut(agentExtension, destination, callerId) {
    const cmd = `originate {origination_caller_id_number=${callerId}}user/${agentExtension}@$\${domain} &bridge(sofia/gateway/telnyx/${destination})`;
    return new Promise((resolve) => {
        connection.api(cmd, resolve);
    });
}
```

### 4. Test the Flow

1. **Create an agent:**
   ```bash
   curl -X POST http://localhost:3000/api/agents \
     -H "Content-Type: application/json" \
     -d '{"extension": "1020", "name": "Test Agent"}'
   ```

2. **Connect WebRTC client** using returned credentials

3. **Create inbound route:**
   ```bash
   curl -X POST http://localhost:3000/api/inbound-routes \
     -H "Content-Type: application/json" \
     -d '{"did_number": "+19495431333", "destination_extension": "1020"}'
   ```

4. **Test inbound:** Call your DID from a phone

5. **Test outbound:**
   ```bash
   curl -X POST http://localhost:3000/api/calls/dial \
     -H "Content-Type: application/json" \
     -d '{"agent_extension": "1020", "destination": "+18005551234"}'
   ```

---

## File Locations Summary

| What | File Path |
|------|-----------|
| Agent XML | `/usr/local/freeswitch/conf/directory/default/{extension}.xml` |
| Inbound Route XML | `/usr/local/freeswitch/conf/dialplan/public/inbound_{did}.xml` |
| Gateway (already done) | `/usr/local/freeswitch/conf/sip_profiles/external/telnyx.xml` |
| Outbound Routes (already done) | `/usr/local/freeswitch/conf/dialplan/default/02_outbound_telnyx.xml` |

---

## ESL Commands Quick Reference

| Action | Command |
|--------|---------|
| Reload all config | `reloadxml` |
| Check registrations | `sofia status profile internal reg` |
| List active calls | `show calls` |
| Make call | `originate {vars}user/ext@domain &bridge(sofia/gateway/telnyx/number)` |
| Hang up call | `uuid_kill {uuid}` |
| Transfer call | `uuid_transfer {uuid} {destination}` |
| Check gateway status | `sofia status gateway telnyx` |

---

## Current FreeSWITCH Server Info

| Setting | Value |
|---------|-------|
| Server IP | 157.173.117.207 |
| ESL Port | 18443 |
| WebSocket (WSS) | 7443 |
| SIP Port (internal) | 5062 |
| SIP Port (external) | 5080 |
| Gateway | telnyx (already configured) |
| Available Extensions | 1020+ (1000-1019 exist) |

---

*Document Version: 2.0 (Simplified)*
*Last Updated: January 14, 2026*
