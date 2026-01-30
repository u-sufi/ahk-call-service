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
import { InboundRoutesService } from './inbound-routes.service';
import { CreateInboundRouteDto, UpdateInboundRouteDto } from './dto';

@Controller('inbound-routes')
export class InboundRoutesController {
  constructor(private readonly inboundRoutesService: InboundRoutesService) {}

  /**
   * POST /api/inbound-routes
   * Create a new inbound route
   */
  @Post()
  create(@Body() createInboundRouteDto: CreateInboundRouteDto) {
    return this.inboundRoutesService.create(createInboundRouteDto);
  }

  /**
   * GET /api/inbound-routes
   * List all active inbound routes
   */
  @Get()
  findAll() {
    return this.inboundRoutesService.findAll();
  }

  /**
   * GET /api/inbound-routes/:id
   * Get a single inbound route by ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inboundRoutesService.findOne(id);
  }

  /**
   * GET /api/inbound-routes/did/:didNumber
   * Get inbound route by DID number
   */
  @Get('did/:didNumber')
  findByDid(@Param('didNumber') didNumber: string) {
    return this.inboundRoutesService.findByDid(didNumber);
  }

  /**
   * PATCH /api/inbound-routes/:id
   * Update an inbound route
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInboundRouteDto: UpdateInboundRouteDto,
  ) {
    return this.inboundRoutesService.update(id, updateInboundRouteDto);
  }

  /**
   * DELETE /api/inbound-routes/:id
   * Delete an inbound route
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inboundRoutesService.remove(id);
  }
}
