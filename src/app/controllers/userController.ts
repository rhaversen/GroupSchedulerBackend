import { type NextFunction, type Request, type Response } from 'express'

import UserModel, { type IUser } from '../models/User.js'

export async function getUser (req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = await UserModel.findById(req.params.id).select('-password').exec()
		if (user === null) { res.status(404).json({ error: 'User not found' }); return }
		res.status(200).json(user)
	} catch (error) {
		next(error)
	}
}

export async function getUsers (req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const users = await UserModel.find().select('-password').exec()
		res.status(200).json(users)
	} catch (error) {
		next(error)
	}
}

export async function updateUser (req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const currentUser = req.user as IUser
		if (currentUser.id !== req.params.id) { res.status(403).json({ error: 'Forbidden' }); return }
		const { username, email } = req.body as { username?: string; email?: string }
		const updated = await UserModel.findByIdAndUpdate(
			req.params.id,
			{ username, email },
			{ new: true, runValidators: true }
		).select('-password').exec()
		if (updated === null) { res.status(404).json({ error: 'User not found' }); return }
		res.status(200).json(updated)
	} catch (error) {
		next(error)
	}
}

export async function deleteUser (req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const currentUser = req.user as IUser
		if (currentUser.id !== req.params.id) { res.status(403).json({ error: 'Forbidden' }); return }
		await UserModel.findByIdAndDelete(req.params.id).exec()
		req.logout(err => { if (err != null) { return } })
		res.status(204).send()
	} catch (error) {
		next(error)
	}
}
