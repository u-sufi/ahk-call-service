import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../core/prisma';
import { LoggerService } from '../logger';
import { FreeswitchConfig } from '../config';
import { EslService } from '../call/esl.service';
import { CreateAgentDto, UpdateAgentDto } from './dto';

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly fsConfig: FreeswitchConfig,
    private readonly eslService: EslService,
  ) {
    this.logger.setContext(AgentsService.name);
  }

  /**
   * Generate a secure random password
   */
  private generatePassword(length = 24): string {
    return crypto
      .randomBytes(length)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, length);
  }

  /**
   * Generate XML configuration for FreeSWITCH agent/extension
   */
  generateAgentXml(data: {
    extension: string;
    password: string;
    callerIdName: string;
    callerIdNumber: string;
  }): string {
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
      <variable name="effective_caller_id_name" value="${data.callerIdName}"/>
      <variable name="effective_caller_id_number" value="${data.callerIdNumber}"/>
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

  /**
   * Create a new agent
   */
  async create(createAgentDto: CreateAgentDto) {
    // Check if extension already exists
    const existingAgent = await this.prisma.agent.findUnique({
      where: { extension: createAgentDto.extension },
    });

    if (existingAgent) {
      throw new ConflictException(
        `Agent with extension "${createAgentDto.extension}" already exists`,
      );
    }

    // Generate secure password
    const password = this.generatePassword();

    // Create agent in database
    const agent = await this.prisma.agent.create({
      data: {
        extension: createAgentDto.extension,
        password,
        name: createAgentDto.name,
        email: createAgentDto.email,
        callerIdName: createAgentDto.callerIdName || createAgentDto.name,
        callerIdNumber:
          createAgentDto.callerIdNumber || createAgentDto.extension,
      },
    });

    // Create agent status record
    await this.prisma.agentStatus.create({
      data: {
        agentId: agent.id,
        status: 'offline',
      },
    });

    // Generate XML for FreeSWITCH
    const xml = this.generateAgentXml({
      extension: agent.extension,
      password,
      callerIdName: agent.callerIdName || agent.name,
      callerIdNumber: agent.callerIdNumber || agent.extension,
    });

    // Reload FreeSWITCH XML configuration
    try {
      await this.eslService.reloadXml();
      this.logger.log(
        `Created agent ${agent.extension} and reloaded FreeSWITCH config`,
      );
    } catch (error) {
      this.logger.warn(
        `Agent created but failed to reload FreeSWITCH: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      success: true,
      data: {
        id: agent.id,
        extension: agent.extension,
        name: agent.name,
        email: agent.email,
        xml, // Return XML for manual deployment if needed
        credentials: {
          username: agent.extension,
          password,
          domain: this.fsConfig.domain,
          websocket_url: `wss://${this.fsConfig.host}:7443`,
          sip_server: this.fsConfig.host,
          sip_port: 5062,
        },
      },
    };
  }

  /**
   * Get all active agents
   */
  async findAll() {
    const agents = await this.prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        extension: true,
        name: true,
        email: true,
        callerIdName: true,
        callerIdNumber: true,
        isActive: true,
        createdAt: true,
        status: {
          select: {
            status: true,
            lastSeen: true,
          },
        },
      },
      orderBy: { extension: 'asc' },
    });

    return {
      success: true,
      data: agents,
    };
  }

  /**
   * Get a single agent by ID
   */
  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        extension: true,
        name: true,
        email: true,
        callerIdName: true,
        callerIdNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        status: {
          select: {
            status: true,
            registeredAt: true,
            lastSeen: true,
            userAgent: true,
            registeredIp: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${id}" not found`);
    }

    return {
      success: true,
      data: agent,
    };
  }

  /**
   * Get agent by extension
   */
  async findByExtension(extension: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { extension },
      select: {
        id: true,
        extension: true,
        name: true,
        email: true,
        callerIdName: true,
        callerIdNumber: true,
        isActive: true,
      },
    });

    if (!agent) {
      throw new NotFoundException(
        `Agent with extension "${extension}" not found`,
      );
    }

    return {
      success: true,
      data: agent,
    };
  }

  /**
   * Get agent credentials for WebRTC/SIP client
   */
  async getCredentials(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      select: {
        extension: true,
        password: true,
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${id}" not found`);
    }

    return {
      success: true,
      data: {
        username: agent.extension,
        password: agent.password,
        domain: this.fsConfig.domain,
        websocket_url: `wss://${this.fsConfig.host}:7443`,
        sip_server: this.fsConfig.host,
        sip_port: 5062,
        stun_server: 'stun:stun.l.google.com:19302',
      },
    };
  }

  /**
   * Check if agent is online (registered to FreeSWITCH)
   */
  async getStatus(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      select: {
        extension: true,
        status: true,
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${id}" not found`);
    }

    // Check live registration status from FreeSWITCH
    let online = false;
    let registrationInfo: {
      registered_from?: string;
      user_agent?: string;
    } = {};

    try {
      const regInfo = await this.eslService.getExtensionRegistration(
        agent.extension,
      );
      online = regInfo.registered;
      registrationInfo = {
        registered_from: regInfo.contact,
        user_agent: regInfo.userAgent,
      };

      // Update status in database
      if (agent.status) {
        await this.prisma.agentStatus.update({
          where: { agentId: id },
          data: {
            status: online ? 'online' : 'offline',
            lastSeen: online ? new Date() : agent.status.lastSeen,
            userAgent: regInfo.userAgent || agent.status.userAgent,
            registeredIp: regInfo.contact || agent.status.registeredIp,
          },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to check registration for ${agent.extension}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      success: true,
      data: {
        extension: agent.extension,
        online,
        ...registrationInfo,
      },
    };
  }

  /**
   * Update an agent
   */
  async update(id: string, updateAgentDto: UpdateAgentDto) {
    const existingAgent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!existingAgent) {
      throw new NotFoundException(`Agent with ID "${id}" not found`);
    }

    const agent = await this.prisma.agent.update({
      where: { id },
      data: updateAgentDto,
    });

    // If caller ID info changed, regenerate XML
    if (updateAgentDto.callerIdName || updateAgentDto.callerIdNumber) {
      const xml = this.generateAgentXml({
        extension: agent.extension,
        password: agent.password,
        callerIdName: agent.callerIdName || agent.name,
        callerIdNumber: agent.callerIdNumber || agent.extension,
      });

      try {
        await this.eslService.reloadXml();
        this.logger.log(
          `Updated agent ${agent.extension} and reloaded FreeSWITCH config`,
        );
      } catch (error) {
        this.logger.warn(
          `Agent updated but failed to reload FreeSWITCH: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return {
        success: true,
        data: agent,
        xml,
      };
    }

    this.logger.log(`Updated agent: ${agent.extension}`);
    return {
      success: true,
      data: agent,
    };
  }

  /**
   * Delete (soft delete) an agent
   */
  async remove(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${id}" not found`);
    }

    // Soft delete - set isActive to false
    await this.prisma.agent.update({
      where: { id },
      data: { isActive: false },
    });

    // Reload FreeSWITCH to remove the extension
    try {
      await this.eslService.reloadXml();
      this.logger.log(
        `Deleted agent ${agent.extension} and reloaded FreeSWITCH config`,
      );
    } catch (error) {
      this.logger.warn(
        `Agent deleted but failed to reload FreeSWITCH: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      success: true,
      message: `Agent ${agent.extension} deleted successfully`,
    };
  }

  /**
   * Regenerate password for an agent
   */
  async regeneratePassword(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${id}" not found`);
    }

    const newPassword = this.generatePassword();

    await this.prisma.agent.update({
      where: { id },
      data: { password: newPassword },
    });

    // Generate new XML
    const xml = this.generateAgentXml({
      extension: agent.extension,
      password: newPassword,
      callerIdName: agent.callerIdName || agent.name,
      callerIdNumber: agent.callerIdNumber || agent.extension,
    });

    try {
      await this.eslService.reloadXml();
      this.logger.log(`Regenerated password for agent ${agent.extension}`);
    } catch (error) {
      this.logger.warn(
        `Password regenerated but failed to reload FreeSWITCH: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      success: true,
      data: {
        extension: agent.extension,
        credentials: {
          username: agent.extension,
          password: newPassword,
          domain: this.fsConfig.domain,
          websocket_url: `wss://${this.fsConfig.host}:7443`,
          sip_server: this.fsConfig.host,
          sip_port: 5062,
        },
        xml,
      },
    };
  }
}
