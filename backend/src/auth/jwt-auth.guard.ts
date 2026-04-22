import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err, user, info) {
    // If there's an error or no user, it's an authentication failure.
    if (err || !user) {
      const message = err?.message || info?.message || 'No user found';
      this.logger.error(`Authentication failed: ${message}`);
      
      // We always throw UnauthorizedException to ensure the client receives a 401 status,
      // not a 500 error, even if the internal error was not an HttpException.
      throw new UnauthorizedException(message || 'Authentication failed');
    }
    return user;
  }
}
