import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateInboundRouteDto {
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{4,6}$/, {
    message: 'Destination extension must be 4-6 digits',
  })
  destinationExtension?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
