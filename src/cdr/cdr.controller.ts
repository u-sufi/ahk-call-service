import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CdrService } from './cdr.service';
import { QueryCdrDto, QueryCdrStatsDto, CreateCdrDto } from './dto';

@Controller('cdr')
export class CdrController {
  constructor(private readonly cdrService: CdrService) {}

  /**
   * POST /api/cdr
   * Create a new call record (internal use, typically from ESL events)
   */
  @Post()
  create(@Body() createCdrDto: CreateCdrDto) {
    return this.cdrService.create(createCdrDto);
  }

  /**
   * GET /api/cdr
   * List call records with filters
   * Query params: from, to, agentExtension, direction, limit, offset
   */
  @Get()
  findAll(@Query() query: QueryCdrDto) {
    return this.cdrService.findAll(query);
  }

  /**
   * GET /api/cdr/stats
   * Get call statistics
   * Query params: from, to, agentExtension
   */
  @Get('stats')
  getStats(@Query() query: QueryCdrStatsDto) {
    return this.cdrService.getStats(query);
  }

  /**
   * GET /api/cdr/:id
   * Get a single call record by ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cdrService.findOne(id);
  }

  /**
   * GET /api/cdr/uuid/:uuid
   * Get call record by FreeSWITCH UUID
   */
  @Get('uuid/:uuid')
  findByUuid(@Param('uuid') uuid: string) {
    return this.cdrService.findByUuid(uuid);
  }

  /**
   * GET /api/cdr/agent/:extension
   * Get recent calls for an agent
   */
  @Get('agent/:extension')
  getAgentCalls(
    @Param('extension') extension: string,
    @Query('limit') limit?: string,
  ) {
    return this.cdrService.getAgentCalls(
      extension,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
