import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAgentDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4,6}$/, {
    message: 'Extension must be 4-6 digits',
  })
  extension: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

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
}
