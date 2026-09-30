import { type Server as HttpServer } from 'http'

import { type RequestHandler } from 'express'
import { Server } from 'socket.io'

import logger from './logger.js'
import config from './setupConfig.js'

let io: Server | undefined

export async function initSocket (server: HttpServer, sessionMiddleware: RequestHandler): Promise<void> {
	io = new Server(server, { cors: config.corsConfig })
	io.engine.use(sessionMiddleware)
	io.use((socket, next) => {
		const req = socket.request as { session?: { passport?: { user?: string } } }
		if (req.session?.passport?.user != null) {
			next()
			return
		}
		next(new Error('Unauthorized'))
	})
	io.on('connection', async (socket) => {
		const req = socket.request as { session?: { passport?: { user?: string } } }
		const userId = req.session?.passport?.user
		logger.info(`Authenticated socket connected: ${socket.id}, user: ${userId ?? 'unknown'}`)
		if (userId != null) {
			await socket.join(userId)
		}
	})
}

export function getSocket (): Server {
	if (io == null) {
		throw new Error('Socket.io is not initialized!')
	}
	return io
}

export function getSocketStatus (): boolean {
	return io != null
}
