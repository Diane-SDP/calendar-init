import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class CreateProjectUserDto {
  @ApiProperty({
    example: '2025-01-02T00:00:00.000Z',
    description: 'Start date of the assignment in ISO 8601 format.',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate!: Date;

  @ApiProperty({
    example: '2025-06-30T23:59:59.000Z',
    description: 'End date of the assignment in ISO 8601 format.',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate!: Date;

  @ApiProperty({
    example: 'd5b0070f-55a8-42d1-9f53-7a7ab1b21bc1',
    format: 'uuid',
    description: 'Identifier of the user assigned to the project.',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    example: '7bebe7a0-158d-4f66-a912-34b2cbf87988',
    format: 'uuid',
    description: 'Identifier of the project linked to the assignment.',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;
}

