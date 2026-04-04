import { BadRequestException, Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";

export type SmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  passwordConfigured: boolean;
};

@Injectable()
export class SmtpService {
  async sendMail(
    settings: SmtpSettings,
    input: {
      to: string;
      subject: string;
      text: string;
      html?: string;
    }
  ) {
    const transporter = this.createTransporter(settings);
    await transporter.sendMail({
      from: settings.fromName ? `"${settings.fromName}" <${settings.fromEmail}>` : settings.fromEmail,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });

    return {
      ok: true
    };
  }

  async verify(settings: SmtpSettings) {
    if (!settings.enabled) {
      throw new BadRequestException("SMTP must be enabled before testing the connection.");
    }

    if (!settings.host || !settings.port || !settings.fromEmail) {
      throw new BadRequestException(
        "SMTP host, port, and from email are required before testing the connection."
      );
    }

    const transporter = this.createTransporter(settings);

    await transporter.verify();

    return {
      ok: true
    };
  }

  private createTransporter(settings: SmtpSettings) {
    if (!settings.enabled) {
      throw new BadRequestException("SMTP must be enabled before email delivery can be used.");
    }

    if (!settings.host || !settings.port || !settings.fromEmail) {
      throw new BadRequestException(
        "SMTP host, port, and from email are required before email delivery can be used."
      );
    }

    return nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.username
        ? {
            user: settings.username,
            pass: settings.password
          }
        : undefined
    });
  }
}
