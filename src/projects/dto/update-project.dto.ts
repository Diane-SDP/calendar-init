import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsOptional, IsString, MinLength, IsUUID } from 'class-validator';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({
    example: 'Internal Calendar Revamp',
    minLength: 3,
    description: 'Updated project name.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({
    example: 'Synchronise the HR calendar with the public API.',
    description: 'Updated project description.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '9e95c8d5-8a58-4128-9b13-7f5da22863fb',
    format: 'uuid',
    description: 'New referring employee for the project.',
  })
  @IsOptional()
  @IsUUID()
  referringEmployeeId?: string;
}

