import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TemplateService {
  private loadTemplate(templateName: string): string {
    const isProd = process.env.NODE_ENV === 'production';
    const templatePath = isProd
      ? join(__dirname, '..', 'Nodemailer', 'templates', `${templateName}.html`)
      : join(process.cwd(), 'src', 'Nodemailer', 'templates', `${templateName}.html`);
    
    return readFileSync(templatePath, 'utf8');
  }

  renderTemplate(templateName: string, data: Record<string, string>): string {
    let template = this.loadTemplate(templateName);
    
    for (const key in data) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      template = template.replace(regex, data[key]);
    }
    
    return template;
  }
}
