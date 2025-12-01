import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { ProjectUser } from './entities/project-user.entity';
import { CreateProjectUserDto } from './dto/create-project-user.dto';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectUsersService {
  constructor(
    @InjectRepository(ProjectUser)
    private readonly projectUsersRepository: Repository<ProjectUser>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly usersService: UsersService,
  ) {}

  private ensureHasAccess(user: User) {
    if (user.role === Role.Employee) {
      throw new UnauthorizedException(
        'Only admins or project managers can perform this action',
      );
    }
  }

  async create(dto: CreateProjectUserDto, currentUser: User) {
    this.ensureHasAccess(currentUser);

    const start = dayjs(dto.startDate);
    const end = dayjs(dto.endDate);

    if (!start.isValid() || !end.isValid()) {
      throw new BadRequestException('Invalid dates provided');
    }

    if (end.isBefore(start)) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const project = await this.projectsRepository.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (
      currentUser.role === Role.ProjectManager &&
      project.referringEmployeeId !== currentUser.id
    ) {
      throw new UnauthorizedException(
        'Project managers can only assign users to their projects',
      );
    }

    await this.usersService.findOne(dto.userId);

    const overlappingAssignment = await this.projectUsersRepository
      .createQueryBuilder('assignment')
      .where('assignment.userId = :userId', { userId: dto.userId })
      .andWhere(
        'assignment.startDate <= :endDate AND assignment.endDate >= :startDate',
        {
          startDate: start.format('YYYY-MM-DD'),
          endDate: end.format('YYYY-MM-DD'),
        },
      )
      .getOne();

    if (overlappingAssignment) {
      throw new ConflictException(
        'User already assigned to a project during this period',
      );
    }

    const assignment = this.projectUsersRepository.create({
      ...dto,
      startDate: start.toDate(),
      endDate: end.toDate(),
    });

    const savedAssignment = await this.projectUsersRepository.save(assignment);
    return this.projectUsersRepository.findOne({
      where: { id: savedAssignment.id },
    });
  }

  async findAllForUser(currentUser: User) {
    if (currentUser.role === Role.Employee) {
      return this.projectUsersRepository.find({
        where: { userId: currentUser.id },
      });
    }

    return this.projectUsersRepository.find();
  }

  async findOneForUser(id: string, currentUser: User) {
    const assignment = await this.projectUsersRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (
      currentUser.role === Role.Employee &&
      assignment.userId !== currentUser.id
    ) {
      throw new UnauthorizedException(
        'You do not have access to this assignment',
      );
    }

    return assignment;
  }
}

