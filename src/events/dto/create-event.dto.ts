import { IsUUID, IsDateString, IsOptional, IsIn, IsString } from 'class-validator';

export class CreateEventDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsIn(['Pending', 'Accepted', 'Declined'])
  eventStatus?: 'Pending' | 'Accepted' | 'Declined' = 'Pending';

  @IsIn(['RemoteWork', 'PaidLeave'])
  eventType!: 'RemoteWork' | 'PaidLeave';

  @IsOptional()
  @IsString()
  eventDescription?: string;

  @IsUUID()
  userId!: string;
}
