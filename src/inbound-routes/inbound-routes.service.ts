import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../core/prisma';
import { LoggerService } from '../logger';
import { EslService } from '../call/esl.service';
import { CreateInboundRouteDto, UpdateInboundRouteDto } from './dto';

@Injectable()
export class InboundRoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eslService: EslService,
  ) {
    this.logger.setContext(InboundRoutesService.name);
  }

  /**
   * Generate XML configuration for FreeSWITCH inbound route
   */
  generateInboundRouteXml(data: {
    didNumber: string;
    destinationExtension: string;
  }): string {
    // Escape + for regex and create safe filename
    const escapedDid = data.didNumber.replace(/\+/g, '\\+');
    const didDigits = data.didNumber.replace(/[^0-9]/g, '');

    return `<include>
  <extension name="inbound_${didDigits}">
    <condition field="destination_number" expression="^(\\+?${escapedDid.replace(/^\\\+/, '')})$">
      <action application="set" data="domain_name=$\${domain}"/>
      <action application="transfer" data="${data.destinationExtension} XML default"/>
    </condition>
  </extension>
</include>`;
  }

  /**
   * Create a new inbound route
   */
  async create(createInboundRouteDto: CreateInboundRouteDto) {
    // Check if route for this DID already exists
    const existingRoute = await this.prisma.inboundRoute.findUnique({
      where: { didNumber: createInboundRouteDto.didNumber },
    });

    if (existingRoute) {
      throw new ConflictException(
        `Route for DID "${createInboundRouteDto.didNumber}" already exists`,
      );
    }

    // Check if destination extension exists
    const agent = await this.prisma.agent.findUnique({
      where: { extension: createInboundRouteDto.destinationExtension },
    });

    if (!agent || !agent.isActive) {
      throw new BadRequestException(
        `Destination extension "${createInboundRouteDto.destinationExtension}" does not exist or is inactive`,
      );
    }

    // Create route in database
    const route = await this.prisma.inboundRoute.create({
      data: {
        didNumber: createInboundRouteDto.didNumber,
        destinationExtension: createInboundRouteDto.destinationExtension,
        description: createInboundRouteDto.description,
      },
    });

    // Generate XML for FreeSWITCH
    const xml = this.generateInboundRouteXml({
      didNumber: route.didNumber,
      destinationExtension: route.destinationExtension,
    });

    // Reload FreeSWITCH XML configuration
    try {
      await this.eslService.reloadXml();
      this.logger.log(
        `Created inbound route ${route.didNumber} -> ${route.destinationExtension}`,
      );
    } catch (error) {
      this.logger.warn(
        `Route created but failed to reload FreeSWITCH: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      success: true,
      data: {
        id: route.id,
        didNumber: route.didNumber,
        destinationExtension: route.destinationExtension,
        description: route.description,
        xml, // Return XML for manual deployment if needed
      },
    };
  }

  /**
   * Get all active inbound routes
   */
  async findAll() {
    const routes = await this.prisma.inboundRoute.findMany({
      where: { isActive: true },
      orderBy: { didNumber: 'asc' },
    });

    return {
      success: true,
      data: routes,
    };
  }

  /**
   * Get a single inbound route by ID
   */
  async findOne(id: string) {
    const route = await this.prisma.inboundRoute.findUnique({
      where: { id },
    });

    if (!route) {
      throw new NotFoundException(`Inbound route with ID "${id}" not found`);
    }

    return {
      success: true,
      data: route,
    };
  }

  /**
   * Get inbound route by DID number
   */
  async findByDid(didNumber: string) {
    const route = await this.prisma.inboundRoute.findUnique({
      where: { didNumber },
    });

    if (!route) {
      throw new NotFoundException(
        `Inbound route for DID "${didNumber}" not found`,
      );
    }

    return {
      success: true,
      data: route,
    };
  }

  /**
   * Update an inbound route
   */
  async update(id: string, updateInboundRouteDto: UpdateInboundRouteDto) {
    const existingRoute = await this.prisma.inboundRoute.findUnique({
      where: { id },
    });

    if (!existingRoute) {
      throw new NotFoundException(`Inbound route with ID "${id}" not found`);
    }

    // If changing destination, verify the extension exists
    if (updateInboundRouteDto.destinationExtension) {
      const agent = await this.prisma.agent.findUnique({
        where: { extension: updateInboundRouteDto.destinationExtension },
      });

      if (!agent || !agent.isActive) {
        throw new BadRequestException(
          `Destination extension "${updateInboundRouteDto.destinationExtension}" does not exist or is inactive`,
        );
      }
    }

    const route = await this.prisma.inboundRoute.update({
      where: { id },
      data: updateInboundRouteDto,
    });

    // Regenerate XML
    const xml = this.generateInboundRouteXml({
      didNumber: route.didNumber,
      destinationExtension: route.destinationExtension,
    });

    // Reload FreeSWITCH XML configuration
    try {
      await this.eslService.reloadXml();
      this.logger.log(
        `Updated inbound route ${route.didNumber} -> ${route.destinationExtension}`,
      );
    } catch (error) {
      this.logger.warn(
        `Route updated but failed to reload FreeSWITCH: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      success: true,
      data: route,
      xml,
    };
  }

  /**
   * Delete an inbound route
   */
  async remove(id: string) {
    const route = await this.prisma.inboundRoute.findUnique({
      where: { id },
    });

    if (!route) {
      throw new NotFoundException(`Inbound route with ID "${id}" not found`);
    }

    // Hard delete the route
    await this.prisma.inboundRoute.delete({
      where: { id },
    });

    // Reload FreeSWITCH to remove the route
    try {
      await this.eslService.reloadXml();
      this.logger.log(`Deleted inbound route for DID ${route.didNumber}`);
    } catch (error) {
      this.logger.warn(
        `Route deleted but failed to reload FreeSWITCH: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      success: true,
      message: `Inbound route for DID ${route.didNumber} deleted successfully`,
    };
  }
}
