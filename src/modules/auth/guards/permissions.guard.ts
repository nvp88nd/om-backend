import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    // SUPER_ADMIN has all permissions
    if (user.role.code === 'SUPER_ADMIN') {
      return true;
    }

    const userPermissions = user.role.rolePermissions?.map((rp: any) => rp.permission?.code) || [];
    
    const hasPermission = requiredPermissions.every((permission) => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have the required permissions to access this resource');
    }

    return true;
  }
}
