import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { Project } from '../../projects/entities/project.entity';
import { ProjectUser } from '../../project-users/entities/project-user.entity';
import { Event } from '../../events/entities/event.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ unique: true })
  public username!: string;

  @Column({ unique: true })
  public email!: string;

  @Column({ select: false })
  public password!: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.Employee,
  })
  public role!: Role;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @OneToMany(() => ProjectUser, (assignment) => assignment.user)
  public projectAssignments!: ProjectUser[];

  @OneToMany(() => Project, (project) => project.referringEmployee)
  public referredProjects!: Project[];

  @OneToMany(() => Event, (event) => event.user)
  public events!: Event[];
}
