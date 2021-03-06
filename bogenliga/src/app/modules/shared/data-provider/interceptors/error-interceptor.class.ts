import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {catchError, retry} from 'rxjs/operators';
import {ErrorHandlingService} from '../../services/error-handling';

const MAX_RETRIES = 2;


@Injectable({
  providedIn: 'root'
})
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private errorHandlingService: ErrorHandlingService) {

  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    return next.handle(request)

               .pipe(
                 // add retries
                 retry(MAX_RETRIES),
                 // add error handling
                 catchError(
                   (error: any, caught: Observable<HttpEvent<any>>) => {

                     // handle connection (0), client (4xx), server (5xx) and custom error codes (9xx)
                     if (error.status === 0 || error.status >= 400) {
                       return this.errorHandlingService.handleHttpError(error);
                       // caught and handle the error
                       // return of(error);
                     }

                     throw error;
                   })
               );
  }
}
