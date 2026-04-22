import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      this.logger.error('No user found in request. Ensure JwtAuthGuard is used before RolesGuard.');
      return false;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      this.logger.warn(`User ${user.email} with role ${user.role} attempted to access resource requiring roles: ${requiredRoles.join(', ')}`);
    }
    
    return hasRole;
  }
}
