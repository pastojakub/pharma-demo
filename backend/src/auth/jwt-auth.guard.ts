import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err, user, info) {
    if (err || !user) {
      const message = err?.message || info?.message || 'No user found';
      this.logger.error(`Authentication failed: ${message}`);
      
      throw new UnauthorizedException(message || 'Authentication failed');
    }
    return user;
  }
}
