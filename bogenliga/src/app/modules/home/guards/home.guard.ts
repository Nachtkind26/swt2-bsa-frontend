import {Injectable} from '@angular/core';
import {CanActivate} from '@angular/router';
import {CurrentUserService} from '../../shared/services/current-user';

@Injectable()
export class HomeGuard implements CanActivate {
  constructor(private currentUserService: CurrentUserService) {
  }

  canActivate() {
    return this.currentUserService.hasAnyPermisson(
      []);
  }
}
