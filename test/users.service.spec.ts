import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/entities/user.entity';
import { EventsService } from '../src/events/events.service';
import { Role } from '../src/common/enums/role.enum';
import { EventType } from '../src/common/enums/event-type.enum';
import { EventStatus } from '../src/common/enums/event-status.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;
  let eventsService: jest.Mocked<EventsService>;

  const baseUser: User = {
    id: 'user-1',
    email: 'john@example.com',
    username: 'john',
    password: 'hashed',
    role: Role.Employee,
    createdAt: new Date(),
    updatedAt: new Date(),
    projectAssignments: [],
    referredProjects: [],
    events: [],
  };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    eventsService = {
      findEventsForUserInMonth: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;

    service = new UsersService(repo, eventsService);
  });

  it('creates a user with hashed password', async () => {
    repo.findOne.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
    repo.create.mockReturnValue({ ...baseUser, password: 'hashed-pw' });
    repo.save.mockResolvedValue({ ...baseUser, password: 'hashed-pw' });
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(baseUser);

    const created = await service.create({
      email: baseUser.email,
      username: baseUser.username,
      password: 'secret',
      role: Role.Employee,
    });

    expect(created.password).toBeUndefined();
  });

  it('rejects duplicate email/username', async () => {
    repo.findOne.mockResolvedValue(baseUser);

    await expect(
      service.create({
        email: baseUser.email,
        username: baseUser.username,
        password: 'secret',
        role: Role.Employee,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('findOne throws when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('conflict on update when email already taken', async () => {
    repo.findOne
      .mockResolvedValueOnce(baseUser)
      .mockResolvedValueOnce({ ...baseUser, id: 'other' });

    await expect(
      service.update(baseUser.id, { email: 'new@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('meal vouchers handles invalid month', async () => {
    await expect(
      service.calculateMealVouchers(baseUser.id, 0, 2024),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('meal vouchers exclude remote work and pending paid leave', async () => {
    const month = 4;
    const year = 2024;

    const events = [
      {
        date: new Date(`${year}-04-02`),
        eventType: EventType.RemoteWork,
        eventStatus: EventStatus.Accepted,
      },
      {
        date: new Date(`${year}-04-03`),
        eventType: EventType.PaidLeave,
        eventStatus: EventStatus.Pending,
      },
      {
        date: new Date(`${year}-04-10`),
        eventType: EventType.PaidLeave,
        eventStatus: EventStatus.Declined,
      },
    ] as any;

    repo.findOne.mockResolvedValue(baseUser);
    eventsService.findEventsForUserInMonth.mockResolvedValue(events);

    const res = await service.calculateMealVouchers(
      baseUser.id,
      month,
      year,
    );

    expect(res.amount).toBe(res.workedDays * 8);
  });
});

