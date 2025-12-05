import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { ProjectUsersService } from '../src/project-users/project-users.service';
import { ProjectUser } from '../src/project-users/entities/project-user.entity';
import { Project } from '../src/projects/entities/project.entity';
import { UsersService } from '../src/users/users.service';
import { Role } from '../src/common/enums/role.enum';
import { User } from '../src/users/entities/user.entity';

describe('ProjectUsersService', () => {
  let service: ProjectUsersService;
  let assignmentsRepo: jest.Mocked<Repository<ProjectUser>>;
  let projectsRepo: jest.Mocked<Repository<Project>>;
  let usersService: jest.Mocked<UsersService>;

  const admin: User = { id: 'admin', role: Role.Admin } as User;
  const pm: User = { id: 'pm-1', role: Role.ProjectManager } as User;
  const employee: User = { id: 'emp-1', role: Role.Employee } as User;

  beforeEach(() => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    assignmentsRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProjectUser>>;

    projectsRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Project>>;

    usersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new ProjectUsersService(assignmentsRepo, projectsRepo, usersService);
  });

  it('blocks employee from creating assignment', async () => {
    await expect(
      service.create(
        {
          userId: employee.id,
          projectId: 'p1',
          startDate: new Date(),
          endDate: new Date(),
        },
        employee,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid dates', async () => {
    await expect(
      service.create(
        {
          userId: employee.id,
          projectId: 'p1',
          startDate: 'bad' as any,
          endDate: new Date(),
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects end date before start', async () => {
    const start = dayjs('2024-05-10');
    const end = dayjs('2024-05-01');
    await expect(
      service.create(
        {
          userId: employee.id,
          projectId: 'p1',
          startDate: start.toDate(),
          endDate: end.toDate(),
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires existing project', async () => {
    projectsRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          userId: employee.id,
          projectId: 'missing',
          startDate: new Date(),
          endDate: new Date(),
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks project manager on other project', async () => {
    projectsRepo.findOne.mockResolvedValue({
      id: 'p1',
      referringEmployeeId: 'someone-else',
    } as Project);

    await expect(
      service.create(
        {
          userId: employee.id,
          projectId: 'p1',
          startDate: new Date(),
          endDate: new Date(),
        },
        pm,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects overlapping assignment', async () => {
    projectsRepo.findOne.mockResolvedValue({
      id: 'p1',
      referringEmployeeId: admin.id,
    } as Project);
    usersService.findOne.mockResolvedValue(employee);

    const qb = assignmentsRepo.createQueryBuilder('');
    (qb.getOne as jest.Mock).mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        {
          userId: employee.id,
          projectId: 'p1',
          startDate: new Date('2024-05-01'),
          endDate: new Date('2024-05-10'),
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates assignment when checks pass', async () => {
    projectsRepo.findOne.mockResolvedValue({
      id: 'p1',
      referringEmployeeId: pm.id,
    } as Project);
    usersService.findOne.mockResolvedValue(employee);

    const qb = assignmentsRepo.createQueryBuilder('');
    (qb.getOne as jest.Mock).mockResolvedValue(null);

    assignmentsRepo.create.mockReturnValue({
      id: 'a1',
      userId: employee.id,
      projectId: 'p1',
    } as ProjectUser);

    assignmentsRepo.save.mockResolvedValue({
      id: 'a1',
      userId: employee.id,
      projectId: 'p1',
    } as ProjectUser);

    assignmentsRepo.findOne.mockResolvedValue({
      id: 'a1',
      userId: employee.id,
      projectId: 'p1',
    } as ProjectUser);

    const res = await service.create(
      {
        userId: employee.id,
        projectId: 'p1',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-10'),
      },
      admin,
    );

    expect(res?.id).toBe('a1');
  });

  it('employee cannot read another assignment', async () => {
    assignmentsRepo.findOne.mockResolvedValue({
      id: 'a1',
      userId: 'someone-else',
    } as ProjectUser);

    await expect(
      service.findOneForUser('a1', employee),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks PM removing assignment on other project', async () => {
    assignmentsRepo.findOne.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
    } as ProjectUser);

    projectsRepo.findOne.mockResolvedValue({
      id: 'p1',
      referringEmployeeId: 'other',
    } as Project);

    await expect(
      service.remove('a1', pm),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('removes assignment when allowed', async () => {
    assignmentsRepo.findOne.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
    } as ProjectUser);

    projectsRepo.findOne.mockResolvedValue({
      id: 'p1',
      referringEmployeeId: pm.id,
    } as Project);

    assignmentsRepo.remove.mockResolvedValue({ id: 'a1' } as ProjectUser);

    const res = await service.remove('a1', pm);
    expect(res.id).toBe('a1');
  });
});

