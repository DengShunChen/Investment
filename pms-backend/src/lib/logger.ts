// pms-backend/src/lib/logger.ts
import winston from 'winston';

const { combine, timestamp, printf, colorize, align } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp: ts, service }) => {
  return `${ts} [${service}] ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    align(),
    // Provide a default service name
    winston.format((info) => {
      info.service = info.service || 'application';
      return info;
    })(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    // Future transports like file or remote logging can be added here
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
  defaultMeta: {
    service: 'pms-backend',
  },
});

export default logger;
