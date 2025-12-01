import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logFilePath = path.resolve(process.cwd(), 'logs.txt');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (!request) {
      return next.handle();
    }

    const { ip, method, originalUrl, params, query, body } = request;
    const logLine = `${new Date().toISOString()} - ${ip ?? 'unknown'} - ${method} ${
      originalUrl ?? ''
    } - params: ${JSON.stringify(params ?? {})} - query: ${JSON.stringify(
      query ?? {},
    )} - body: ${JSON.stringify(body ?? {})}\n`;

    return next.handle().pipe(
      tap(() => {
        fs.promises
          .appendFile(this.logFilePath, logLine, { encoding: 'utf-8' })
          .catch(() => undefined);
      }),
    );
  }
}

