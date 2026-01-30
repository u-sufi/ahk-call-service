import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CallsService } from './calls.service';
import { DialDto, TransferDto, InitiateDto } from './dto';

@Controller('calls')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  /**
   * GET /api/calls/health
   * Check ESL connection health
   */
  @Get('health')
  health() {
    return this.calls.health();
  }

  /**
   * GET /api/calls/active
   * Get all active calls
   */
  @Get('active')
  getActiveCalls() {
    return this.calls.getActiveCalls();
  }

  /**
   * GET /api/calls/registrations
   * Get all registered extensions
   */
  @Get('registrations')
  getRegistrations() {
    return this.calls.getRegistrations();
  }

  /**
   * GET /api/calls/gateway-status
   * Get Telnyx gateway status
   */
  @Get('gateway-status')
  getGatewayStatus() {
    return this.calls.getGatewayStatus();
  }

  /**
   * POST /api/calls/dial
   * Click-to-call: Initiate outbound call
   */
  @Post('dial')
  dial(@Body() dialDto: DialDto) {
    return this.calls.dial(dialDto);
  }

  /**
   * POST /api/calls/test-echo
   * Test outbound calling with echo
   */
  @Post('test-echo')
  testEcho(@Body() body: { destinationNumber: string }) {
    return this.calls.testEcho(body.destinationNumber);
  }

  /**
   * POST /api/calls/initiate
   * Initiate outbound call (legacy endpoint)
   */
  @Post('initiate')
  initiate(@Body() body: InitiateDto) {
    return this.calls.initiate(body.to, body.from, body.agentExt);
  }

  /**
   * GET /api/calls/:uuid/status
   * Get call status
   */
  @Get(':uuid/status')
  status(@Param('uuid') uuid: string) {
    return this.calls.status(uuid);
  }

  /**
   * POST /api/calls/:uuid/hangup
   * Hang up a call
   */
  @Post(':uuid/hangup')
  hangup(@Param('uuid') uuid: string) {
    return this.calls.hangup(uuid);
  }

  /**
   * DELETE /api/calls/:uuid
   * Hang up a call (alternative endpoint)
   */
  @Delete(':uuid')
  hangupDelete(@Param('uuid') uuid: string) {
    return this.calls.hangup(uuid);
  }

  /**
   * POST /api/calls/:uuid/transfer
   * Transfer a call to another extension
   */
  @Post(':uuid/transfer')
  transfer(@Param('uuid') uuid: string, @Body() body: TransferDto) {
    return this.calls.transfer(uuid, body.destination);
  }

  /**
   * POST /api/calls/:uuid/dtmf
   * Send DTMF tones to a call
   */
  @Post(':uuid/dtmf')
  sendDtmf(@Param('uuid') uuid: string, @Body() body: { digits: string }) {
    return this.calls.sendDtmf(uuid, body.digits);
  }

  /**
   * POST /api/calls/:uuid/hold
   * Place call on hold
   */
  @Post(':uuid/hold')
  hold(@Param('uuid') uuid: string) {
    return this.calls.hold(uuid, true);
  }

  /**
   * POST /api/calls/:uuid/unhold
   * Resume call from hold
   */
  @Post(':uuid/unhold')
  unhold(@Param('uuid') uuid: string) {
    return this.calls.hold(uuid, false);
  }

  /**
   * POST /api/calls/:uuid/record/start
   * Start recording a call
   */
  @Post(':uuid/record/start')
  startRecording(
    @Param('uuid') uuid: string,
    @Body() body: { filePath?: string },
  ) {
    return this.calls.startRecording(uuid, body.filePath);
  }

  /**
   * POST /api/calls/:uuid/record/stop
   * Stop recording a call
   */
  @Post(':uuid/record/stop')
  stopRecording(@Param('uuid') uuid: string) {
    return this.calls.stopRecording(uuid);
  }
}
