import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3_CLIENT } from './s3.provider';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class S3Helper {
  private readonly bucket: string;
  private readonly region: string;

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
  }

  getFileUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Returns the S3 object key for URLs produced by this app, or empty string if the URL is not ours.
   */
  extractKeyFromUrl(url: string): string {
    if (!url) {
      return '';
    }
    const prefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
    if (!url.startsWith(prefix)) {
      return '';
    }
    return decodeURIComponent(url.slice(prefix.length));
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    const ext = path.extname(file.originalname || '') || '';
    const key = `${folder}/${uuidv4()}${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        ACL: 'public-read',
      }),
    );
    return { url: this.getFileUrl(key), key };
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) {
      return;
    }
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
