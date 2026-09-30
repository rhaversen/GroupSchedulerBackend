import type express from 'express'

declare module 'express-session' {
	interface Session {
		ipAddress?: string
		loginTime?: Date
		lastActivity?: Date
		userAgent?: string
		type?: 'user' | 'unknown'
	}
}

export const getIPAddress = (req: express.Request): string => {
	if (req.ip == null || req.ip === '') {
		return 'unknown'
	}
	return req.ip
}
