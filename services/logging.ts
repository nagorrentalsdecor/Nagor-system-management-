import { UserRole } from '../types';

export enum ActivityType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  DOWNLOAD = 'DOWNLOAD'
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO date string
  userId: string;
  userName: string;
  userRole: UserRole;
  action: ActivityType;
  entity: string; // 'Booking', 'Customer', 'Transaction', etc.
  entityId: string;
  entityName?: string; // e.g., customer name, booking id, etc.
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  details?: string; // Additional context
  ipAddress?: string;
}

const STORAGE_KEY = 'nagor_activity_logs';
const MAX_LOGS = 10000; // Keep last 10k logs

export const activityLogger = {
  // Log an activity
  log: (activity: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const logs = activityLogger.getLogs();
    
    const newLog: ActivityLog = {
      ...activity,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };

    // Add to beginning of array and keep size limited
    logs.unshift(newLog);
    if (logs.length > MAX_LOGS) {
      logs.pop();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    return newLog;
  },

  // Get all logs
  getLogs: (): ActivityLog[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  // Get logs by user
  getLogsByUser: (userId: string): ActivityLog[] => {
    return activityLogger.getLogs().filter(log => log.userId === userId);
  },

  // Get logs by entity
  getLogsByEntity: (entity: string, entityId: string): ActivityLog[] => {
    return activityLogger.getLogs().filter(
      log => log.entity === entity && log.entityId === entityId
    );
  },

  // Get logs by action type
  getLogsByAction: (action: ActivityType): ActivityLog[] => {
    return activityLogger.getLogs().filter(log => log.action === action);
  },

  // Get logs within date range
  getLogsByDateRange: (startDate: Date, endDate: Date): ActivityLog[] => {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return activityLogger.getLogs().filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= start && logTime <= end;
    });
  },

  // Clear old logs (older than days)
  clearOldLogs: (days: number) => {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - days);
    
    const logs = activityLogger.getLogs();
    const filtered = logs.filter(log => new Date(log.timestamp) > cutoffTime);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Clear all logs
  clearAllLogs: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Export logs as CSV
  exportAsCSV: (logs: ActivityLog[] = activityLogger.getLogs()): string => {
    if (logs.length === 0) return '';

    const headers = ['Date', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'Entity Name', 'Details'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.userName,
      log.userRole,
      log.action,
      log.entity,
      log.entityId,
      log.entityName || '-',
      log.details || '-'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  },

  // Download logs as file
  downloadLogs: (logs: ActivityLog[] = activityLogger.getLogs(), filename: string = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`) => {
    const csv = activityLogger.exportAsCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Helper functions for common logging patterns
export const logActivity = {
  // Create operations
  created: (entity: string, entityId: string, userName: string, userId: string, userRole: UserRole, entityName?: string, details?: string) => {
    return activityLogger.log({
      userId,
      userName,
      userRole,
      action: ActivityType.CREATE,
      entity,
      entityId,
      entityName,
      details
    });
  },

  // Update operations with change tracking
  updated: (entity: string, entityId: string, userName: string, userId: string, userRole: UserRole, changes: ActivityLog['changes'], entityName?: string) => {
    return activityLogger.log({
      userId,
      userName,
      userRole,
      action: ActivityType.UPDATE,
      entity,
      entityId,
      entityName,
      changes,
      details: `Updated ${changes?.length || 0} field(s)`
    });
  },

  // Delete operations
  deleted: (entity: string, entityId: string, userName: string, userId: string, userRole: UserRole, entityName?: string) => {
    return activityLogger.log({
      userId,
      userName,
      userRole,
      action: ActivityType.DELETE,
      entity,
      entityId,
      entityName,
      details: `Deleted ${entity}: ${entityName || entityId}`
    });
  },

  // Export operations
  exported: (entity: string, format: string, userName: string, userId: string, userRole: UserRole, recordCount?: number) => {
    return activityLogger.log({
      userId,
      userName,
      userRole,
      action: ActivityType.EXPORT,
      entity,
      entityId: 'N/A',
      details: `Exported ${recordCount || 'multiple'} ${entity} records as ${format}`
    });
  },

  // Approval operations
  approved: (entity: string, entityId: string, userName: string, userId: string, userRole: UserRole, entityName?: string) => {
    return activityLogger.log({
      userId,
      userName,
      userRole,
      action: ActivityType.APPROVE,
      entity,
      entityId,
      entityName,
      details: `Approved ${entity}: ${entityName || entityId}`
    });
  }
};
