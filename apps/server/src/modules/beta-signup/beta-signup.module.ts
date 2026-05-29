import { Module } from '@nestjs/common';
import { BootstrapModule } from '../bootstrap/bootstrap.module';
import { SmtpService } from '../settings/smtp.service';
import { BetaSignupController } from './beta-signup.controller';
import { BetaSignupRepository } from './beta-signup.repository';
import { BetaSignupService } from './beta-signup.service';

@Module({
  imports: [BootstrapModule],
  controllers: [BetaSignupController],
  providers: [BetaSignupService, BetaSignupRepository, SmtpService],
})
export class BetaSignupModule {}
