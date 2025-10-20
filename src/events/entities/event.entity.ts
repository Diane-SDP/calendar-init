import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ type: 'timestamptz' })
  public date!: Date;

  @Column({
    type: 'enum',
    enum: ['Pending', 'Accepted', 'Declined'],
    default: 'Pending',
  })
  public eventStatus!: 'Pending' | 'Accepted' | 'Declined';

  @Column({
    type: 'enum',
    enum: ['RemoteWork', 'PaidLeave'],
  })
  public eventType!: 'RemoteWork' | 'PaidLeave';

  @Column({ type: 'text', nullable: true })
  public eventDescription?: string;

  @Column('uuid')
  public userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  public user?: User;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;
}
