import { Controller, Get, Query } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';

@Controller('activity-log')
export class ActivityLogController {
    constructor(private readonly activityLogService: ActivityLogService) { }

    @Get()
    async getRecentActivities(@Query('limit') limit?: string) {
        const limitNum = limit ? parseInt(limit, 10) : 50;
        const activities = await this.activityLogService.getRecentActivities(limitNum);
        return { success: true, data: activities };
    }

    @Get('by-type')
    async getActivitiesByType(
        @Query('type') type: string,
        @Query('limit') limit?: string,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const activities = await this.activityLogService.getActivitiesByType(type, limitNum);
        return { success: true, data: activities };
    }

    @Get('by-action')
    async getActivitiesByAction(
        @Query('action') action: 'created' | 'updated' | 'deleted',
        @Query('limit') limit?: string,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const activities = await this.activityLogService.getActivitiesByAction(action, limitNum);
        return { success: true, data: activities };
    }
}
