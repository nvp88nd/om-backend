import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { performance } from 'node:perf_hooks';
import { AppModule } from './app.module';

async function bootstrap() {
  config();

  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.use((req, res, next) => {
    const start = performance.now();

    res.on('finish', () => {
      const ms = (performance.now() - start).toFixed(3);
      const status = res.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

      const colors = {
        error: '\x1b[31m', // Đỏ
        warn: '\x1b[33m', // Vàng
        info: '\x1b[32m', // Xanh lá
        reset: '\x1b[0m'   // Reset về màu mặc định
      };
      const color = colors[level];

      console.log(`${color}${level}${colors.reset}: ${req.method} ${req.originalUrl} ${status} - ${ms} ms`);
    });

    next();
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
