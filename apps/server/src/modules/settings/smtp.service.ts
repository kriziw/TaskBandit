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
  async verify(settings: SmtpSettings) {
    if (!settings.enabled) {
      throw new BadRequestException("SMTP must be enabled before testing the connection.");
    }

    if (!settings.host || !settings.port || !settings.fromEmail) {
      throw new BadRequestException(
        "SMTP host, port, and from email are required before testing the connection."
      );
    }

    const transporter = nodemailer.createTransport({
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

    await transporter.verify();

    return {
      ok: true
    };
  }
}
