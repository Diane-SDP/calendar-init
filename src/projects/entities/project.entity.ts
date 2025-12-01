import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProjectUser } from '../../project-users/entities/project-user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'referring_employee_id' })
  referringEmployeeId!: string;

  @ManyToOne(() => User, (user) => user.referredProjects, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'referring_employee_id' })
  referringEmployee!: User;

  @OneToMany(() => ProjectUser, (projectUser) => projectUser.project)
  assignments!: ProjectUser[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

