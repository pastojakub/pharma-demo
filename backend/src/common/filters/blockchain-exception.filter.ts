import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { GatewayError } from '@hyperledger/fabric-gateway';
import { Prisma } from '@prisma/client';

@Catch()
export class BlockchainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Vyskytla sa neočakávaná chyba systému.';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = typeof res === 'object' ? res.message || res : res;
      errorType = 'HttpException';
    } 
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Záznam s týmito údajmi už existuje (duplicita).';
        errorType = 'PrismaUniqueConstraintError';
      }
    }
    else if (exception instanceof GatewayError || exception.message?.includes('chaincode')) {


      errorType = 'BlockchainError';
      
      const rawMessage = exception.message.toLowerCase();
      
      if (rawMessage.includes('already exists')) {
        message = 'Záznam s týmto ID už na blockchaine existuje.';
      } else if (rawMessage.includes('not found')) {
        message = 'Požadovaný záznam nebol na blockchaine nájdený.';
      } else if (rawMessage.includes('access denied') || rawMessage.includes('authorization')) {
        message = 'Prístup k tejto operácii na blockchaine bol zamietnutý.';
      } else if (rawMessage.includes('not enough stock') || rawMessage.includes('nedostatok')) {
        message = 'Operácia zlyhala: Nedostatok zásob na sklade.';
      } else {
        message = 'Chyba pri komunikácii s blockchain sieťou.';
      }
    }

    this.logger.error(
      `[${errorType}] ${request.method} ${request.url}\nDetail: ${exception.message}\nStack: ${exception.stack}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message,
      error: errorType
    });
  }
}
