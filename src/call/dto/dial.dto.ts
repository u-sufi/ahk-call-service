import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';

export class DialDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4,6}$/, {
    message: 'Agent extension must be 4-6 digits',
  })
  agentExtension: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message:
      'Destination must be a valid phone number (10-15 digits, optional + prefix)',
  })
  destination: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Caller ID number must be a valid phone number',
  })
  callerIdNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  callerIdName?: string;
}

export class TransferDto {
  @IsNotEmpty()
  @IsString()
  destination: string;
}

export class InitiateDto {
  @IsNotEmpty()
  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  agentExt?: string;
}
