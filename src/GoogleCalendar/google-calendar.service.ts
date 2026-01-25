import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { GoogleCredentials } from 'src/Entities/entities/GoogleCredentials';
import { Users } from 'src/Entities/entities/Users';
import { CreateEventDto } from './dto/create-event.dto';
import { EventResponseDto } from './dto/event-response.dto';

const scryptAsync = promisify(scrypt);

@Injectable()
export class GoogleCalendarService {
  private oauth2Client: any;
  private encryptionKey: Buffer | null = null;
  private encryptionKeyPromise: Promise<Buffer> | null = null;

  constructor(
    @InjectRepository(GoogleCredentials)
    private readonly googleCredentialsRepository: Repository<GoogleCredentials>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2({
      clientId,
      clientSecret,
      redirectUri,
    });
  }

  private async getEncryptionKey(): Promise<Buffer> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    if (!this.encryptionKeyPromise) {
      this.encryptionKeyPromise = this.initializeEncryptionKey();
    }

    this.encryptionKey = await this.encryptionKeyPromise;
    return this.encryptionKey;
  }

  private async initializeEncryptionKey(): Promise<Buffer> {
    const encryptionKeyString = this.configService.get<string>('GOOGLE_ENCRYPTION_KEY');
    if (!encryptionKeyString) {
      throw new Error('GOOGLE_ENCRYPTION_KEY not configured');
    }
    return (await scryptAsync(encryptionKeyString, 'salt', 32)) as Buffer;
  }

  /**
   * Encrypt token before storing in database
   */
  private async encrypt(text: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-ctr', key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt token after retrieving from database
   */
  private async decrypt(encryptedText: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = createDecipheriv('aes-256-ctr', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString();
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(userId: number): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
    });

    console.log('Generated Google OAuth URL:', url);
    return url;
  }

  /**
   * Handle OAuth callback and store tokens
   */
  async handleCallback(code: string, state: string): Promise<{ success: boolean; userId: number }> {
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      const userId = decodedState.userId;

      // Fetch user to get registered email
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new BadRequestException('Failed to obtain tokens from Google');
      }

      // Get user info to get email (now required)
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const googleEmail = userInfo.data.email || null;

      if (!googleEmail) {
        throw new BadRequestException('Failed to retrieve email from Google account');
      }

      // Validate that Google email matches teacher's email
      if (googleEmail.toLowerCase() !== user.email.toLowerCase()) {
        throw new BadRequestException(
          `Google account email (${googleEmail}) does not match your registered email (${user.email}). Please use the same email address.`
        );
      }

      // Calculate token expiry
      const tokenExpiry = tokens.expiry_date 
        ? new Date(tokens.expiry_date) 
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      // Encrypt tokens
      const encryptedAccessToken = await this.encrypt(tokens.access_token);
      const encryptedRefreshToken = await this.encrypt(tokens.refresh_token);

      // Check if credentials already exist
      const existingCredentials = await this.googleCredentialsRepository.findOne({
        where: { userId },
      });

      if (existingCredentials) {
        // Update existing credentials
        existingCredentials.accessToken = encryptedAccessToken;
        existingCredentials.refreshToken = encryptedRefreshToken;
        existingCredentials.tokenExpiry = tokenExpiry;
        existingCredentials.googleEmail = googleEmail;
        existingCredentials.isActive = true;
        existingCredentials.updatedAt = new Date();
        await this.googleCredentialsRepository.save(existingCredentials);
      } else {
        // Create new credentials
        const credentials = this.googleCredentialsRepository.create({
          userId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry,
          googleEmail,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await this.googleCredentialsRepository.save(credentials);
      }

      return { success: true, userId };
    } catch (error) {
      throw new BadRequestException(`Failed to handle OAuth callback: ${error.message}`);
    }
  }

  /**
   * Get and refresh access token if needed
   */
  private async getAccessToken(userId: number): Promise<string> {
    const credentials = await this.googleCredentialsRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!credentials) {
      throw new NotFoundException('Google account not connected');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date();
    const expiryTime = credentials.tokenExpiry ? new Date(credentials.tokenExpiry) : new Date(0);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiryTime <= fiveMinutesFromNow) {
      // Token expired or about to expire, refresh it
      try {
        const decryptedRefreshToken = await this.decrypt(credentials.refreshToken);
        this.oauth2Client.setCredentials({
          refresh_token: decryptedRefreshToken,
        });

        const { credentials: newTokens } = await this.oauth2Client.refreshAccessToken();
        
        if (!newTokens.access_token) {
          throw new Error('Failed to refresh access token');
        }

        // Update stored tokens
        const encryptedAccessToken = await this.encrypt(newTokens.access_token);
        const tokenExpiry = newTokens.expiry_date 
          ? new Date(newTokens.expiry_date) 
          : new Date(Date.now() + 3600 * 1000);

        credentials.accessToken = encryptedAccessToken;
        credentials.tokenExpiry = tokenExpiry;
        credentials.updatedAt = new Date();
        await this.googleCredentialsRepository.save(credentials);

        return newTokens.access_token;
      } catch (error) {
        // Refresh failed, mark as inactive
        credentials.isActive = false;
        await this.googleCredentialsRepository.save(credentials);
        throw new UnauthorizedException('Failed to refresh access token. Please reconnect your Google account.');
      }
    }

    // Token is still valid, decrypt and return
    return await this.decrypt(credentials.accessToken);
  }

  /**
   * Get authenticated calendar client
   */
  private async getCalendarClient(userId: number) {
    const accessToken = await this.getAccessToken(userId);
    this.oauth2Client.setCredentials({ access_token: accessToken });
    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Check connection status
   */
  async getConnectionStatus(userId: number): Promise<{ connected: boolean; googleEmail?: string }> {
    const credentials = await this.googleCredentialsRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!credentials) {
      return { connected: false };
    }

    return {
      connected: true,
      googleEmail: credentials.googleEmail || undefined,
    };
  }

  /**
   * Disconnect Google account
   */
  async disconnect(userId: number): Promise<void> {
    const credentials = await this.googleCredentialsRepository.findOne({
      where: { userId },
    });

    if (!credentials) {
      throw new NotFoundException('Google account not connected');
    }

    credentials.isActive = false;
    credentials.updatedAt = new Date();
    await this.googleCredentialsRepository.save(credentials);
  }

  /**
   * List upcoming events
   */
  async listEvents(userId: number, maxResults: number = 10): Promise<EventResponseDto[]> {
    const calendar = await this.getCalendarClient(userId);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    return events.map((event) => {
      const meetLink = event.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri;

      return {
        id: event.id || '',
        summary: event.summary || 'No title',
        description: event.description || undefined,
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        meetLink: meetLink || undefined,
        htmlLink: event.htmlLink || '',
      };
    });
  }

  /**
   * Create event with Google Meet
   */
  async createEvent(userId: number, createEventDto: CreateEventDto): Promise<EventResponseDto> {
    const calendar = await this.getCalendarClient(userId);

    const startDateTime = new Date(createEventDto.startDateTime);
    const endDateTime = new Date(startDateTime.getTime() + createEventDto.duration * 60 * 1000);

    const event = {
      summary: createEventDto.title,
      description: createEventDto.description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(7),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    const createdEvent = response.data;
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video',
    )?.uri;

    return {
      id: createdEvent.id || '',
      summary: createdEvent.summary || '',
      description: createdEvent.description || undefined,
      start: createdEvent.start?.dateTime || createdEvent.start?.date || '',
      end: createdEvent.end?.dateTime || createdEvent.end?.date || '',
      meetLink: meetLink || undefined,
      htmlLink: createdEvent.htmlLink || '',
    };
  }
}

