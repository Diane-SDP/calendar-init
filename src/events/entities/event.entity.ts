import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EventStatus } from '../../common/enums/event-status.enum';
import { EventType } from '../../common/enums/event-type.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.Pending,
  })
  eventStatus!: EventStatus;

  @Column({ type: 'enum', enum: EventType })
  eventType!: EventType;

  @Column({ type: 'text', nullable: true })
  eventDescription?: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.events, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

