import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventType } from '../../common/enums/event-type.enum';

export class CreateEventDto {
  @IsDateString()
  @IsNotEmpty()
  date!: Date;

  @IsOptional()
  @IsString()
  eventDescription?: string;

  @IsEnum(EventType)
  eventType!: EventType;
}

