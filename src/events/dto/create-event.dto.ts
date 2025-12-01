import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventType } from '../../common/enums/event-type.enum';

export class CreateEventDto {
  @ApiProperty({
    example: '2025-03-24T08:30:00.000Z',
    description: 'ISO 8601 date of the event (UTC).',
  })
  @IsDateString()
  @IsNotEmpty()
  date!: Date;

  @ApiPropertyOptional({
    example: 'Quarterly business review',
    description: 'Optional text to describe the event.',
  })
  @IsOptional()
  @IsString()
  eventDescription?: string;

  @ApiProperty({
    enum: EventType,
    example: Object.values(EventType)[0],
    description: 'Event type controls the approval workflow.',
  })
  @IsEnum(EventType)
  eventType!: EventType;
}

