import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CallsService } from './calls.service';

@Controller('calls')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  // GET /api/calls/health
  @Get('health')
  health() {
    return this.calls.health();
  }

  // POST /api/calls/test-echo
  @Post('test-echo')
  testEcho(@Body() body: { destinationNumber: string }) {
    return this.calls.testEcho(body.destinationNumber);
  }

  // POST /api/calls/initiate
  @Post('initiate')
  initiate(@Body() body: { to: string; from?: string }) {
    return this.calls.initiate(body.to, body.from);
  }

  // DELETE /api/calls/:uuid
  @Delete(':uuid')
  hangup(@Param('uuid') uuid: string) {
    return this.calls.hangup(uuid);
  }

  // GET /api/calls/:uuid/status
  @Get(':uuid/status')
  status(@Param('uuid') uuid: string) {
    return this.calls.status(uuid);
  }
}
