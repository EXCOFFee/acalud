import { Module } from '@nestjs/common';
import { MonitoringService, MonitoringController } from './monitoring.service';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
