import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SmtpService, type SmtpSettings } from "../src/modules/settings/smtp.service";

const { createTransport } = vi.hoisted(() => ({
  createTransport: vi.fn()
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport
  }
}));

describe("SmtpService", () => {
  const service = new SmtpService();
  const baseSettings: SmtpSettings = {
    enabled: false,
    host: "smtp.example.com",
    port: 587,
    secure: false,
    username: "bandit",
    password: "secret",
    fromEmail: "bandit@example.com",
    fromName: "TaskBandit",
    passwordConfigured: true
  };

  beforeEach(() => {
    createTransport.mockReset();
  });

  it("allows smtp verification while smtp usage is disabled", async () => {
    const verify = vi.fn().mockResolvedValue(undefined);
    createTransport.mockReturnValue({ verify });

    await expect(service.verify(baseSettings)).resolves.toEqual({ ok: true });
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it("returns a structured config error when required smtp fields are missing", async () => {
    await expect(
      service.verify({
        ...baseSettings,
        host: "",
        fromEmail: ""
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    try {
      await service.verify({
        ...baseSettings,
        host: "",
        fromEmail: ""
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        code: "SMTP_CONFIG_INVALID",
        message: "SMTP host, port, and from email are required before testing the connection."
      });
    }
  });

  it("returns a structured auth error for smtp login failures", async () => {
    createTransport.mockReturnValue({
      verify: vi.fn().mockRejectedValue({
        code: "EAUTH",
        command: "AUTH",
        responseCode: 535,
        message: "Invalid login"
      })
    });

    await expect(service.verify(baseSettings)).rejects.toBeInstanceOf(BadGatewayException);

    try {
      await service.verify(baseSettings);
    } catch (error) {
      expect(error).toBeInstanceOf(BadGatewayException);
      expect((error as BadGatewayException).getResponse()).toEqual({
        code: "SMTP_AUTH_FAILED",
        message: "Authentication failed with the SMTP server."
      });
    }
  });

  it("returns a structured connection error for unreachable smtp servers", async () => {
    createTransport.mockReturnValue({
      verify: vi.fn().mockRejectedValue({
        code: "ENOTFOUND",
        message: "getaddrinfo ENOTFOUND smtp.invalid"
      })
    });

    await expect(service.verify(baseSettings)).rejects.toBeInstanceOf(BadGatewayException);

    try {
      await service.verify(baseSettings);
    } catch (error) {
      expect(error).toBeInstanceOf(BadGatewayException);
      expect((error as BadGatewayException).getResponse()).toEqual({
        code: "SMTP_CONNECTION_FAILED",
        message: "Could not connect to the SMTP server."
      });
    }
  });

  it("returns a structured tls error for secure handshake failures", async () => {
    createTransport.mockReturnValue({
      verify: vi.fn().mockRejectedValue({
        code: "ESOCKET",
        message: "certificate has expired during TLS handshake"
      })
    });

    await expect(service.verify(baseSettings)).rejects.toBeInstanceOf(BadGatewayException);

    try {
      await service.verify(baseSettings);
    } catch (error) {
      expect(error).toBeInstanceOf(BadGatewayException);
      expect((error as BadGatewayException).getResponse()).toEqual({
        code: "SMTP_TLS_FAILED",
        message: "A TLS handshake with the SMTP server failed."
      });
    }
  });

  it("returns a safe fallback error for unknown smtp failures", async () => {
    createTransport.mockReturnValue({
      verify: vi.fn().mockRejectedValue({
        code: "EUNKNOWN",
        message: "some raw transport dump that should not leak"
      })
    });

    await expect(service.verify(baseSettings)).rejects.toBeInstanceOf(BadGatewayException);

    try {
      await service.verify(baseSettings);
    } catch (error) {
      expect(error).toBeInstanceOf(BadGatewayException);
      expect((error as BadGatewayException).getResponse()).toEqual({
        code: "SMTP_TEST_FAILED",
        message: "The SMTP test failed."
      });
    }
  });
});
