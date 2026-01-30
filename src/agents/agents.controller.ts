import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  /**
   * POST /api/agents
   * Create a new agent/extension
   */
  @Post()
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  /**
   * GET /api/agents
   * List all active agents
   */
  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  /**
   * GET /api/agents/:id
   * Get a single agent by ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.findOne(id);
  }

  /**
   * GET /api/agents/extension/:extension
   * Get agent by extension number
   */
  @Get('extension/:extension')
  findByExtension(@Param('extension') extension: string) {
    return this.agentsService.findByExtension(extension);
  }

  /**
   * GET /api/agents/:id/credentials
   * Get SIP/WebRTC credentials for an agent
   */
  @Get(':id/credentials')
  getCredentials(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.getCredentials(id);
  }

  /**
   * GET /api/agents/:id/status
   * Check if agent is online (registered to FreeSWITCH)
   */
  @Get(':id/status')
  getStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.getStatus(id);
  }

  /**
   * PATCH /api/agents/:id
   * Update an agent
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, updateAgentDto);
  }

  /**
   * DELETE /api/agents/:id
   * Delete (soft delete) an agent
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.remove(id);
  }

  /**
   * POST /api/agents/:id/regenerate-password
   * Regenerate password for an agent
   */
  @Post(':id/regenerate-password')
  regeneratePassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.regeneratePassword(id);
  }
}
