import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dayjs from 'dayjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { EventsService } from '../events/events.service';
import { EventType } from '../common/enums/event-type.enum';
import { EventStatus } from '../common/enums/event-status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly eventsService: EventsService,
  ) {}

  private sanitizeUser(user: User): User {
    if (!user) {
      return user;
    }
    delete (user as Partial<User>).password;
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or username already exists',
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || Role.Employee,
    });

    const savedUser = await this.usersRepository.save(user);
    return this.findOne(savedUser.id);
  }

  async findAll(): Promise<User[]> {
    const users = await this.usersRepository.find();
    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.sanitizeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { username },
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Si le mot de passe est fourni, le hasher
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
    }

    // Vérifier les conflits d'email/username si ils sont modifiés
    if (updateUserDto.email || updateUserDto.username) {
      const existingUser = await this.usersRepository.findOne({
        where: [
          updateUserDto.email ? { email: updateUserDto.email } : {},
          updateUserDto.username ? { username: updateUserDto.username } : {},
        ].filter((condition) => Object.keys(condition).length > 0),
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          'User with this email or username already exists',
        );
      }
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);
    return this.sanitizeUser(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.usersRepository.remove(user);
  }

  async assertUserHasRole(userId: string, roles: Role[]): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !roles.includes(user.role)) {
      throw new UnauthorizedException('Insufficient permissions');
    }
  }

  async calculateMealVouchers(
    userId: string,
    month: number,
    year = dayjs().year(),
  ) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    await this.findOne(userId);

    const start = dayjs().year(year).month(month - 1).startOf('month');
    const end = start.endOf('month');

    const events = await this.eventsService.findEventsForUserInMonth(
      userId,
      month,
      year,
    );

    const excludedDates = new Set(
      events
        .filter(
          (event) =>
            (event.eventType === EventType.RemoteWork ||
              event.eventType === EventType.PaidLeave) &&
            event.eventStatus !== EventStatus.Declined,
        )
        .map((event) => dayjs(event.date).format('YYYY-MM-DD')),
    );

    let workedDays = 0;
    let cursor = start.clone();

    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
      const dayOfWeek = cursor.day();
      const formatted = cursor.format('YYYY-MM-DD');

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !excludedDates.has(formatted)) {
        workedDays += 1;
      }

      cursor = cursor.add(1, 'day');
    }

    const amount = workedDays * 8;

    return {
      userId,
      month,
      year,
      workedDays,
      amount,
      currency: 'EUR',
    };
  }
}
