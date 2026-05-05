import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    const maskedBody = this.maskSensitiveData(body);

    return next.handle().pipe(
      tap((response) => {
        const statusCode = context.switchToHttp().getResponse().statusCode;
        const delay = Date.now() - now;
        
        const maskedResponse = this.maskSensitiveData(response);

        this.logger.debug(
          `${method} ${url} ${statusCode} - ${delay}ms\n[REQ] ${JSON.stringify(maskedBody)}\n[RES] ${JSON.stringify(maskedResponse)}`,
        );
      }),
    );
  }

  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    let cloned;
    try {
      cloned = JSON.parse(JSON.stringify(data));
    } catch (e) {
      return '[Non-serializable Data]';
    }
    
    const sensitiveKeys = [
      'price', 'quantity', 'metadata', 'finalAgreedPrice', 
      'priceOffer', 'password', 'access_token', 'credentials', 
      'privateKey', 'keystore'
    ];
    
    const mask = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(typeof sk === 'string' ? sk.toLowerCase() : ''))) {
          obj[key] = '***MASKED***';
        } else if (typeof obj[key] === 'object') {
          mask(obj[key]);
        }
      }
    };

    if (Array.isArray(cloned)) {
      cloned.forEach(mask);
    } else {
      mask(cloned);
    }
    
    return cloned;
  }
}
