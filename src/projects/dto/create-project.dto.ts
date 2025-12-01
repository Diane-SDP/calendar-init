import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'Internal Calendar Revamp',
    minLength: 3,
    description: 'Project name that will be displayed to the teams.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional({
    example: 'Synchronise the HR calendar with the public API.',
    description: 'Short description that explains the project scope.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '9e95c8d5-8a58-4128-9b13-7f5da22863fb',
    format: 'uuid',
    description: 'Identifier of the employee who sponsors the project.',
  })
  @IsUUID()
  @IsNotEmpty()
  referringEmployeeId!: string;
}

