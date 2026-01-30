import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateCdrDto {
  @IsString()
  uuid: string;

  @IsOptional()
  @IsString()
  callerIdName?: string;

  @IsOptional()
  @IsString()
  callerIdNumber?: string;

  @IsOptional()
  @IsString()
  destinationNumber?: string;

  @IsOptional()
  @IsIn(['inbound', 'outbound'])
  direction?: 'inbound' | 'outbound';

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  answerTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsInt()
  billsec?: number;

  @IsOptional()
  @IsString()
  hangupCause?: string;

  @IsOptional()
  @IsString()
  recordingPath?: string;

  @IsOptional()
  @IsString()
  agentExtension?: string;
}
