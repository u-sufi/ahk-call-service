import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateInboundRouteDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message:
      'DID number must be a valid phone number (10-15 digits, optional + prefix)',
  })
  didNumber: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4,6}$/, {
    message: 'Destination extension must be 4-6 digits',
  })
  destinationExtension: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
