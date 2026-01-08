# FreeSWITCH Integration - DevOps Guide

## Overview

This document explains how our NestJS backend integrates with FreeSWITCH to initiate calls via Telnyx. This is for the DevOps team managing the FreeSWITCH server.

---

## Architecture

```
┌─────────────────┐
│  NestJS Backend │  (Port 3000)
│  157.x.x.x      │
└────────┬────────┘
         │ ESL Connection (Port 8021)
         │ Commands: originate, hangup, status
         ↓
┌─────────────────────────┐
│  FreeSWITCH Server      │  (157.173.117.207)
│  ESL: Port 8021         │
│  SIP Internal: 5060     │
│  SIP External: 5080     │
└────────┬────────────────┘
         │ SIP INVITE
         │ Gateway: "telnyx"
         ↓
┌─────────────────────────┐
│  Telnyx SIP Server      │
│  sip.telnyx.eu:5060     │
│  Caller ID: +19495431333│
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  PSTN / Destination     │
│  e.g., +923244902616    │
└─────────────────────────┘
```

---

## What the Backend Does

### 1. Connects to FreeSWITCH via ESL

**Connection Details:**
- **Host:** `157.173.117.207`
- **Port:** `8021` (Event Socket Layer)
- **Password:** `ClueCon` (default ESL password)
- **Protocol:** TCP

**Connection Code:**
```javascript
const conn = new Connection('157.173.117.207', 8021, 'ClueCon', callback);
```

### 2. Sends Originate Commands

When a user makes a call via API, the backend sends this ESL command:

```
originate {origination_caller_id_number=+19495431333,call_direction=outbound}sofia/gateway/telnyx/+923244902616 &echo()
```

**Command Breakdown:**

| Part | Description |
|------|-------------|
| `originate` | FreeSWITCH command to initiate a call |
| `{...}` | Channel variables (metadata) |
| `origination_caller_id_number=+19495431333` | Caller ID to display |
| `call_direction=outbound` | Call direction flag |
| `sofia/gateway/telnyx/+923244902616` | Dial string: use "telnyx" gateway to call this number |
| `&echo()` | Application to run when call is answered (echo test) |

### 3. Receives Responses

**Success Response:**
```
+OK a1b2c3d4-e5f6-7890-abcd-ef1234567890
```
(Returns the call UUID)

**Error Response:**
```
-ERR CALL_REJECTED
-ERR SUBSCRIBER_ABSENT
-ERR GATEWAY_DOWN
```

---

## FreeSWITCH Requirements

### Required Configuration

#### 1. ESL (Event Socket Layer) Must Be Enabled

**File:** `/usr/local/freeswitch/conf/autoload_configs/event_socket.conf.xml`

```xml
<configuration name="event_socket.conf" description="Socket Client">
  <settings>
    <param name="nat-map" value="false"/>
    <param name="listen-ip" value="0.0.0.0"/>
    <param name="listen-port" value="8021"/>
    <param name="password" value="ClueCon"/>
  </settings>
</configuration>
```

**Verify ESL is listening:**
```bash
netstat -tulpn | grep 8021
```

**Expected output:**
```
tcp  0  0  0.0.0.0:8021  0.0.0.0:*  LISTEN  12345/freeswitch
```

#### 2. Telnyx Gateway Must Be Configured

**File:** `/usr/local/freeswitch/conf/sip_profiles/external/telnyx.xml`

```xml
<include>
  <gateway name="telnyx">
    <param name="username" value="YOUR_TELNYX_USERNAME"/>
    <param name="password" value="YOUR_TELNYX_PASSWORD"/>
    <param name="realm" value="sip.telnyx.eu"/>
    <param name="proxy" value="sip.telnyx.eu"/>
    <param name="register" value="true"/>
    <param name="caller-id-in-from" value="true"/>
    <param name="extension-in-contact" value="true"/>
  </gateway>
</include>
```

**After creating/editing, reload:**
```bash
fs_cli -x "reloadxml"
fs_cli -x "sofia profile external restart"
```

#### 3. External SIP Profile Must Be Running

**Verify:**
```bash
fs_cli -x "sofia status"
```

**Expected output should include:**
```
external          profile  sip:mod_sofia@157.173.117.207:5080  RUNNING (0)
```

---

## Verification Steps

### Step 1: Check ESL Connection

**From backend server, test ESL connection:**
```bash
telnet 157.173.117.207 8021
```

**Expected:**
```
Content-Type: auth/request
```

**Type:**
```
auth ClueCon
```

**Expected:**
```
Content-Type: command/reply
Reply-Text: +OK accepted
```

### Step 2: Check Telnyx Gateway Status

```bash
fs_cli -x "sofia status gateway telnyx"
```

**Expected (GOOD):**
```
Gateway: telnyx
Status: UP
State: REGED
Ping: 17ms
Calls-IN: 0
Calls-OUT: 0
```

**If you see (BAD):**
```
State: NOREG    → Not registered (check credentials)
State: DOWN     → Cannot reach Telnyx (check network)
State: TRYING   → Still attempting to register
```

### Step 3: Test Call Manually

**From FreeSWITCH CLI:**
```bash
fs_cli -x "originate sofia/gateway/telnyx/+923244902616 &echo()"
```

**What should happen:**
1. Command returns a UUID: `+OK a1b2c3d4-...`
2. Phone +923244902616 rings
3. When answered, you hear yourself (echo)

**If this works, the backend API will work!**

### Step 4: Check FreeSWITCH Logs

**Enable debug logging:**
```bash
fs_cli
/log 7
```

**Then trigger a call from the API and watch for:**

**Success:**
```
[NOTICE] switch_channel.c:1104 New Channel sofia/gateway/telnyx/+923244902616
[NOTICE] sofia.c:8268 Hangup sofia/gateway/telnyx/+923244902616 [CS_EXECUTE] [NORMAL_CLEARING]
```

**Failure:**
```
[ERR] sofia_reg.c:1886 telnyx Failed to authenticate
[ERR] sofia.c:4826 Hangup sofia/gateway/telnyx/+923244902616 [CS_CONSUME_MEDIA] [CALL_REJECTED]
```

---

## Common Issues & Solutions

### Issue 1: Connection Timeout

**Error in backend logs:**
```
FreeSWITCH ESL error: connect ETIMEDOUT 157.173.117.207:8021
```

**Cause:** Port 8021 is blocked by firewall

**Solution:**
```bash
# Check if port is open
netstat -tulpn | grep 8021

# Open port in firewall
ufw allow 8021/tcp
# OR
iptables -A INPUT -p tcp --dport 8021 -j ACCEPT
```

### Issue 2: Connection Ended Immediately

**Error in backend logs:**
```
FreeSWITCH ESL connection ended
```

**Cause:** Wrong ESL password or FreeSWITCH closed connection

**Solution:**
```bash
# Check ESL password in config
grep password /usr/local/freeswitch/conf/autoload_configs/event_socket.conf.xml

# Should be: <param name="password" value="ClueCon"/>
```

### Issue 3: CALL_REJECTED

**Error in backend logs:**
```
Originate failed: -ERR CALL_REJECTED
```

**Possible Causes:**
1. **Telnyx gateway is DOWN**
   ```bash
   fs_cli -x "sofia status gateway telnyx"
   # If DOWN, check credentials and network
   ```

2. **Telnyx account has no balance**
   - Check Telnyx dashboard

3. **Invalid destination number format**
   - Must include country code: `+923244902616`

4. **Telnyx blocking the call**
   - Check Telnyx call logs

**Solution:**
```bash
# Test gateway manually
fs_cli -x "originate sofia/gateway/telnyx/+923244902616 &echo()"

# Check gateway registration
fs_cli -x "sofia status gateway telnyx"

# Verify Telnyx credentials
cat /usr/local/freeswitch/conf/sip_profiles/external/telnyx.xml
```

### Issue 4: SUBSCRIBER_ABSENT

**Error in backend logs:**
```
Originate failed: -ERR SUBSCRIBER_ABSENT
```

**Cause:** Trying to call an internal extension that doesn't exist

**This happens when:**
- Using agent mode (not direct dial)
- Agent extension is not registered with FreeSWITCH

**Solution:**
- Use `directDial: true` in API request
- OR register the agent with FreeSWITCH first

### Issue 5: INVALID_GATEWAY

**Error in backend logs:**
```
Originate failed: -ERR INVALID_GATEWAY
```

**Cause:** Gateway "telnyx" doesn't exist in FreeSWITCH config

**Solution:**
```bash
# Check if gateway exists
fs_cli -x "sofia status gateway telnyx"

# If not found, create the gateway file
nano /usr/local/freeswitch/conf/sip_profiles/external/telnyx.xml

# Then reload
fs_cli -x "reloadxml"
fs_cli -x "sofia profile external restart"
```

---

## Testing the Integration

### Test 1: ESL Connection

**From backend:**
```bash
curl http://localhost:3000/api/calls/health
```

**Expected:**
```json
{
  "connected": true,
  "message": "Connected to FreeSWITCH"
}
```

### Test 2: Echo Call

**From backend:**
```bash
curl -X POST http://localhost:3000/api/calls/test-echo \
  -H "Content-Type: application/json" \
  -d '{"destinationNumber": "+923244902616"}'
```

**Expected:**
```json
{
  "callUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "agentFsId": 0,
  "destination": "+923244902616",
  "status": "initiated",
  "message": "Echo test call initiated..."
}
```

**What happens:**
1. Phone +923244902616 rings
2. When answered, you hear yourself (echo)
3. This confirms FreeSWITCH → Telnyx → PSTN is working

### Test 3: Manual FreeSWITCH Test

**Bypass the backend entirely:**
```bash
fs_cli -x "originate sofia/gateway/telnyx/+923244902616 &echo()"
```

**If this works but the API doesn't:**
- ESL connection issue
- ESL password wrong
- Firewall blocking port 8021

**If this fails:**
- Telnyx gateway issue
- Telnyx credentials wrong
- Network connectivity issue

---

## Network Requirements

### Ports That Must Be Open

| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 8021 | TCP | Backend → FreeSWITCH | ESL commands |
| 5060 | UDP | FreeSWITCH ↔ Telnyx | SIP signaling |
| 5080 | UDP | FreeSWITCH ↔ Telnyx | SIP external profile |
| 16384-32768 | UDP | FreeSWITCH ↔ Telnyx | RTP media (audio) |

### Firewall Rules

```bash
# ESL
ufw allow from BACKEND_IP to any port 8021 proto tcp

# SIP
ufw allow 5060/udp
ufw allow 5080/udp

# RTP
ufw allow 16384:32768/udp
```

---

## Monitoring & Logs

### Check FreeSWITCH Status
```bash
systemctl status freeswitch
```

### View FreeSWITCH Logs
```bash
tail -f /usr/local/freeswitch/log/freeswitch.log
```

### Real-time Call Monitoring
```bash
fs_cli
/log 7
/events all
```

### Check Active Calls
```bash
fs_cli -x "show channels"
```

### Check Gateway Status
```bash
fs_cli -x "sofia status gateway telnyx"
```

---

## Quick Troubleshooting Checklist

- [ ] FreeSWITCH is running: `systemctl status freeswitch`
- [ ] ESL port is open: `netstat -tulpn | grep 8021`
- [ ] ESL password is correct: `grep password /usr/local/freeswitch/conf/autoload_configs/event_socket.conf.xml`
- [ ] Telnyx gateway exists: `ls /usr/local/freeswitch/conf/sip_profiles/external/telnyx.xml`
- [ ] Telnyx gateway is UP: `fs_cli -x "sofia status gateway telnyx"`
- [ ] External profile is running: `fs_cli -x "sofia status"`
- [ ] Can reach Telnyx: `ping sip.telnyx.eu`
- [ ] Manual call works: `fs_cli -x "originate sofia/gateway/telnyx/+923244902616 &echo()"`

---

## Contact Points

**If manual FreeSWITCH test works but API doesn't:**
→ Backend/ESL connection issue (check firewall, ESL password)

**If manual FreeSWITCH test fails:**
→ FreeSWITCH/Telnyx configuration issue (check gateway config, credentials, network)

**Backend logs location:**
```
Console output when running: npm run start:dev
```

**FreeSWITCH logs location:**
```
/usr/local/freeswitch/log/freeswitch.log
```

---

## Summary

The backend sends simple ESL commands to FreeSWITCH:
```
originate sofia/gateway/telnyx/DESTINATION &echo()
```

For this to work, FreeSWITCH needs:
1. ✅ ESL enabled on port 8021
2. ✅ Telnyx gateway configured and registered
3. ✅ External SIP profile running
4. ✅ Network connectivity to Telnyx

**Test manually first:**
```bash
fs_cli -x "originate sofia/gateway/telnyx/+923244902616 &echo()"
```

If this works, the API will work! 🎯
