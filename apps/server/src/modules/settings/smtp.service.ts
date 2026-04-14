import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";
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

type SafeSmtpTestError = {
  code:
    | "SMTP_AUTH_FAILED"
    | "SMTP_CONFIG_INVALID"
    | "SMTP_CONNECTION_FAILED"
    | "SMTP_TEST_FAILED"
    | "SMTP_TLS_FAILED";
  message: string;
};

type SmtpTransportError = {
  code?: string;
  command?: string;
  message?: string;
  responseCode?: number;
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
    const transporter = this.createTransporter(settings, {
      requireEnabled: false,
      action: "testing the connection"
    });

    try {
      await transporter.verify();
    } catch (error) {
      throw this.createSafeTestFailure(error);
    }

    return {
      ok: true
    };
  }

  private createTransporter(
    settings: SmtpSettings,
    options: { action: string; requireEnabled?: boolean } = {
      action: "email delivery can be used",
      requireEnabled: true
    }
  ) {
    if (options.requireEnabled !== false && !settings.enabled) {
      throw new BadRequestException("SMTP must be enabled before email delivery can be used.");
    }

    if (!settings.host || !settings.port || !settings.fromEmail) {
      throw new BadRequestException(this.createConfigError(options.action));
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

  private createConfigError(action: string): SafeSmtpTestError {
    return {
      code: "SMTP_CONFIG_INVALID",
      message: `SMTP host, port, and from email are required before ${action}.`
    };
  }

  private createSafeTestFailure(error: unknown) {
    const payload = this.classifyTestFailure(error);
    return new BadGatewayException(payload);
  }

  private classifyTestFailure(error: unknown): SafeSmtpTestError {
    const transportError = this.readTransportError(error);
    const code = transportError.code;
    const message = transportError.message;
    const command = transportError.command;
    const responseCode = transportError.responseCode;

    if (code === "EAUTH" || command === "AUTH" || responseCode === 535) {
      return {
        code: "SMTP_AUTH_FAILED",
        message: "Authentication failed with the SMTP server."
      };
    }

    if (
      code === "ETLS" ||
      (code === "ESOCKET" && /(certificate|handshake|ssl|starttls|tls)/.test(message))
    ) {
      return {
        code: "SMTP_TLS_FAILED",
        message: "A TLS handshake with the SMTP server failed."
      };
    }

    if (
      code === "ECONNECTION" ||
      code === "ECONNREFUSED" ||
      code === "ECONNRESET" ||
      code === "EAI_AGAIN" ||
      code === "ENOTFOUND" ||
      code === "ESOCKET" ||
      code === "ETIMEDOUT"
    ) {
      return {
        code: "SMTP_CONNECTION_FAILED",
        message: "Could not connect to the SMTP server."
      };
    }

    return {
      code: "SMTP_TEST_FAILED",
      message: "The SMTP test failed."
    };
  }

  private readTransportError(error: unknown) {
    if (!error || typeof error !== "object") {
      return {
        code: "",
        command: "",
        message: "",
        responseCode: 0
      };
    }

    const transportError = error as SmtpTransportError;
    return {
      code: typeof transportError.code === "string" ? transportError.code.toUpperCase() : "",
      command: typeof transportError.command === "string" ? transportError.command.toUpperCase() : "",
      message: typeof transportError.message === "string" ? transportError.message.toLowerCase() : "",
      responseCode: typeof transportError.responseCode === "number" ? transportError.responseCode : 0
    };
  }
}
