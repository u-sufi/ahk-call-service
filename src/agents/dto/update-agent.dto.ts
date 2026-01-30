import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  callerIdName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  callerIdNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
