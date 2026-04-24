import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export const S3_CLIENT = 'S3_CLIENT';

export const s3ClientProvider = {
  provide: S3_CLIENT,
  useFactory: (configService: ConfigService) => {
    return new S3Client({
      region: configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  },
  inject: [ConfigService],
};
