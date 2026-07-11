import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { OutboxWorker } from './outbox-worker';

/** Worker de outbox (CU-E05). Usa el EmailProvider (EmailModule) y el pool global (PgModule). */
@Module({
  imports: [EmailModule],
  providers: [OutboxWorker],
  exports: [OutboxWorker],
})
export class OutboxModule {}
