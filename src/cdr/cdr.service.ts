import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma';
import { LoggerService } from '../logger';
import { QueryCdrDto, QueryCdrStatsDto, CreateCdrDto } from './dto';

@Injectable()
export class CdrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CdrService.name);
  }

  /**
   * Create a new call record (typically called from ESL event handler)
   */
  async create(createCdrDto: CreateCdrDto) {
    // Check if record already exists (avoid duplicates)
    const existing = await this.prisma.callRecord.findUnique({
      where: { uuid: createCdrDto.uuid },
    });

    if (existing) {
      this.logger.warn(`CDR already exists for UUID: ${createCdrDto.uuid}`);
      return {
        success: true,
        data: existing,
        message: 'Record already exists',
      };
    }

    // Find agent by extension if provided
    let agentId: string | undefined;
    if (createCdrDto.agentExtension) {
      const agent = await this.prisma.agent.findUnique({
        where: { extension: createCdrDto.agentExtension },
      });
      if (agent) {
        agentId = agent.id;
      }
    }

    const record = await this.prisma.callRecord.create({
      data: {
        uuid: createCdrDto.uuid,
        callerIdName: createCdrDto.callerIdName,
        callerIdNumber: createCdrDto.callerIdNumber,
        destinationNumber: createCdrDto.destinationNumber,
        direction: createCdrDto.direction,
        startTime: createCdrDto.startTime
          ? new Date(createCdrDto.startTime)
          : undefined,
        answerTime: createCdrDto.answerTime
          ? new Date(createCdrDto.answerTime)
          : undefined,
        endTime: createCdrDto.endTime
          ? new Date(createCdrDto.endTime)
          : undefined,
        duration: createCdrDto.duration || 0,
        billsec: createCdrDto.billsec || 0,
        hangupCause: createCdrDto.hangupCause,
        recordingPath: createCdrDto.recordingPath,
        agentExtension: createCdrDto.agentExtension,
        agentId,
      },
    });

    this.logger.log(`CDR saved: ${record.uuid}`);
    return {
      success: true,
      data: record,
    };
  }

  /**
   * Get call records with filters
   */
  async findAll(query: QueryCdrDto) {
    const where: {
      startTime?: { gte?: Date; lte?: Date };
      agentExtension?: string;
      direction?: string;
    } = {};

    // Date filters
    if (query.from || query.to) {
      where.startTime = {};
      if (query.from) {
        where.startTime.gte = new Date(query.from);
      }
      if (query.to) {
        where.startTime.lte = new Date(query.to);
      }
    }

    // Agent filter
    if (query.agentExtension) {
      where.agentExtension = query.agentExtension;
    }

    // Direction filter
    if (query.direction) {
      where.direction = query.direction;
    }

    const [records, total] = await Promise.all([
      this.prisma.callRecord.findMany({
        where,
        orderBy: { startTime: 'desc' },
        take: query.limit,
        skip: query.offset,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              extension: true,
            },
          },
        },
      }),
      this.prisma.callRecord.count({ where }),
    ]);

    return {
      success: true,
      data: {
        total,
        limit: query.limit,
        offset: query.offset,
        records,
      },
    };
  }

  /**
   * Get a single call record by ID
   */
  async findOne(id: string) {
    const record = await this.prisma.callRecord.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            extension: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Call record with ID "${id}" not found`);
    }

    return {
      success: true,
      data: record,
    };
  }

  /**
   * Get call record by UUID
   */
  async findByUuid(uuid: string) {
    const record = await this.prisma.callRecord.findUnique({
      where: { uuid },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            extension: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Call record with UUID "${uuid}" not found`);
    }

    return {
      success: true,
      data: record,
    };
  }

  /**
   * Get call statistics
   */
  async getStats(query: QueryCdrStatsDto) {
    const where: {
      startTime?: { gte?: Date; lte?: Date };
      agentExtension?: string;
    } = {};

    // Date filters
    if (query.from || query.to) {
      where.startTime = {};
      if (query.from) {
        where.startTime.gte = new Date(query.from);
      }
      if (query.to) {
        where.startTime.lte = new Date(query.to);
      }
    }

    // Agent filter
    if (query.agentExtension) {
      where.agentExtension = query.agentExtension;
    }

    // Get aggregate stats
    const [totalStats, inboundStats, outboundStats, answeredStats, byAgent] =
      await Promise.all([
        // Total calls
        this.prisma.callRecord.aggregate({
          where,
          _count: true,
          _sum: {
            duration: true,
            billsec: true,
          },
        }),
        // Inbound calls
        this.prisma.callRecord.count({
          where: { ...where, direction: 'inbound' },
        }),
        // Outbound calls
        this.prisma.callRecord.count({
          where: { ...where, direction: 'outbound' },
        }),
        // Answered calls (billsec > 0)
        this.prisma.callRecord.count({
          where: { ...where, billsec: { gt: 0 } },
        }),
        // Stats by agent
        this.prisma.callRecord.groupBy({
          by: ['agentExtension'],
          where: {
            ...where,
            agentExtension: { not: null },
          },
          _count: true,
          _sum: {
            duration: true,
            billsec: true,
          },
        }),
      ]);

    // Get agent names for the stats
    const agentExtensions = byAgent
      .map((a) => a.agentExtension)
      .filter((ext): ext is string => ext !== null);

    const agents = await this.prisma.agent.findMany({
      where: { extension: { in: agentExtensions } },
      select: { extension: true, name: true },
    });

    const agentMap = new Map(agents.map((a) => [a.extension, a.name]));

    const totalCalls = totalStats._count;
    const totalDuration = totalStats._sum.duration || 0;
    const missedCalls = totalCalls - answeredStats;

    return {
      success: true,
      data: {
        total_calls: totalCalls,
        inbound_calls: inboundStats,
        outbound_calls: outboundStats,
        answered_calls: answeredStats,
        missed_calls: missedCalls,
        total_duration: totalDuration,
        average_duration:
          totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        by_agent: byAgent.map((a) => ({
          extension: a.agentExtension,
          name: a.agentExtension
            ? agentMap.get(a.agentExtension) || 'Unknown'
            : 'Unknown',
          total_calls: a._count,
          total_duration: a._sum.duration || 0,
        })),
      },
    };
  }

  /**
   * Get recent calls for an agent
   */
  async getAgentCalls(agentExtension: string, limit = 10) {
    const records = await this.prisma.callRecord.findMany({
      where: { agentExtension },
      orderBy: { startTime: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: records,
    };
  }
}
