import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { BlockchainExceptionFilter } from './common/filters/blockchain-exception.filter';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Use Helmet for secure HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // Global Filter: Sanitize Errors (Prevents info leakage)
  app.useGlobalFilters(new BlockchainExceptionFilter());

  // Global Interceptor: Mask sensitive data in logs
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Debug Middleware: Log Authorization Header
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      console.log(
        `[DEBUG] Incoming Request: ${req.method} ${req.url} - Auth Header Present`,
      );
    } else {
      console.log(
        `[DEBUG] Incoming Request: ${req.method} ${req.url} - MISSING Auth Header`,
      );
    }
    next();
  });

  // Serve static files from 'uploads' folder
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
