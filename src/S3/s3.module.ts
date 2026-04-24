import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { s3ClientProvider } from './s3.provider';
import { S3Helper } from './s3.helper';

@Module({
  imports: [ConfigModule],
  providers: [s3ClientProvider, S3Helper],
  exports: [S3Helper],
})
export class S3Module {}
