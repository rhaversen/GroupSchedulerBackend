/* eslint-disable @typescript-eslint/no-unused-expressions */
// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { expect } from 'chai'
import { describe, it } from 'mocha'

import UserModel, { type IUser } from '../../../app/models/User.js'

import '../../testSetup.js'

describe('User Model', function () {
	let testUserFields: {
		username: string
		email: string
		password: string
	}

	beforeEach(function () {
		testUserFields = {
			username: 'testUser',
			email: 'test@example.com',
			password: 'testPassword123'
		}
	})

	describe('User Creation', function () {
		it('should create a valid user', async function () {
			const user = await UserModel.create(testUserFields)
			expect(user).to.exist
			expect(user.username).to.equal(testUserFields.username)
			expect(user.email).to.equal(testUserFields.email)
			expect(user.password).to.not.equal(testUserFields.password) // Should be hashed
			expect(user.confirmed).to.be.false
			expect(user.blackoutPeriods).to.be.an('array').that.is.empty
		})

		it('should trim username', async function () {
			const user = await UserModel.create({
				...testUserFields,
				username: '  trimmed  '
			})
			expect(user.username).to.equal('trimmed')
		})

		it('should convert email to lowercase', async function () {
			const user = await UserModel.create({
				...testUserFields,
				email: 'TEST@EXAMPLE.COM'
			})
			expect(user.email).to.equal('test@example.com')
		})

		it('should generate confirmation code on creation', async function () {
			const user = await UserModel.create(testUserFields)
			expect(user.confirmationCode).to.exist
			expect(user.expirationDate).to.exist
			expect(user.expirationDate).to.be.a('date')
		})

		it('should hash password on creation', async function () {
			const user = await UserModel.create(testUserFields)
			expect(user.password).to.not.equal(testUserFields.password)
			expect(user.password.length).to.be.greaterThan(10)
		})
	})

	describe('User Validation', function () {
		it('should not create user without username', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					username: undefined
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create user without email', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					email: undefined
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create user without password', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					password: undefined
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create user with invalid email', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					email: 'invalid-email'
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create user with duplicate email', async function () {
			await UserModel.create(testUserFields)
			let errorOccurred = false
			try {
				const user1 = await UserModel.create({
					...testUserFields,
					username: 'user'
				})
				await user1.save()
				const user2 = await UserModel.create({
					...testUserFields,
					username: 'differentUser'
				})
				await user2.save()
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create user with username too long', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					username: 'a'.repeat(51)
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create user with password too short', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					password: '123'
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create user with email too short', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					email: 'a@b'
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create user with email too long', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					email: 'a'.repeat(47) + '@b.c'
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})
	})

	describe('User Methods', function () {
		let user: IUser

		beforeEach(async function () {
			user = await UserModel.create(testUserFields)
		})

		describe('comparePassword', function () {
			it('should return true for correct password', async function () {
				const isMatch = await user.comparePassword(testUserFields.password)
				expect(isMatch).to.be.true
			})

			it('should return false for incorrect password', async function () {
				const isMatch = await user.comparePassword('wrongPassword')
				expect(isMatch).to.be.false
			})
		})

		describe('confirmUser', function () {
			it('should confirm user and remove expiration', function () {
				user.confirmUser()
				expect(user.confirmed).to.be.true
				expect(user.expirationDate).to.be.undefined
				expect(user.confirmationCode).to.be.undefined
			})
		})

		describe('generateNewConfirmationCode', function () {
			it('should generate new confirmation code', async function () {
				const oldCode = user.confirmationCode
				const newCode = await user.generateNewConfirmationCode()
				expect(newCode).to.exist
				expect(newCode).to.not.equal(oldCode)
				expect(user.confirmationCode).to.equal(newCode)
				expect(user.expirationDate).to.exist
			})
		})

		describe('generateNewPasswordResetCode', function () {
			it('should generate password reset code', async function () {
				const resetCode = await user.generateNewPasswordResetCode()
				expect(resetCode).to.exist
				expect(user.passwordResetCode).to.equal(resetCode)
				expect(user.passwordResetExpirationDate).to.exist
			})
		})

		describe('generateNewDeletionCode', function () {
			it('should generate deletion code', async function () {
				const deletionCode = await user.generateNewDeletionCode()
				expect(deletionCode).to.exist
				expect(user.deletionCode).to.equal(deletionCode)
				expect(user.deletionCodeExpirationDate).to.exist
			})
		})

		describe('resetPassword', function () {
			it('should reset password with valid code', async function () {
				const resetCode = await user.generateNewPasswordResetCode()
				const newPassword = 'newPassword123'

				await user.resetPassword(newPassword, resetCode)
				await user.save()

				expect(user.passwordResetCode).to.be.undefined
				expect(user.passwordResetExpirationDate).to.be.undefined

				// Verify new password works
				const isMatch = await user.comparePassword(newPassword)
				expect(isMatch).to.be.true
			})

			it('should not reset password with invalid code', async function () {
				await user.generateNewPasswordResetCode()
				const oldPassword = user.password
				const newPassword = 'newPassword123'

				await user.resetPassword(newPassword, 'invalidCode')
				await user.save()

				expect(user.password).to.equal(oldPassword)
				expect(user.passwordResetCode).to.exist
			})
		})

		describe('confirmDeletion', function () {
			it('should delete user with valid deletion code', async function () {
				const deletionCode = await user.generateNewDeletionCode()
				await user.save()

				const result = await user.confirmDeletion(deletionCode)
				expect(result).to.be.true

				const deletedUser = await UserModel.findById(user._id)
				expect(deletedUser).to.be.null
			})

			it('should not delete user with invalid deletion code', async function () {
				await user.generateNewDeletionCode()
				await user.save()

				const result = await user.confirmDeletion('invalidCode')
				expect(result).to.be.false

				const existingUser = await UserModel.findById(user._id)
				expect(existingUser).to.exist
			})
		})
	})

	describe('Blackout Periods', function () {
		it('should allow valid blackout periods', async function () {
			const user = await UserModel.create({
				...testUserFields,
				blackoutPeriods: [
					{ start: 100, end: 200 },
					{ start: 300, end: 400 }
				]
			})
			expect(user.blackoutPeriods).to.have.lengthOf(2)
			expect(user.blackoutPeriods[0].start).to.equal(100)
			expect(user.blackoutPeriods[0].end).to.equal(200)
		})

		it('should not allow blackout period with start >= end', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					blackoutPeriods: [{ start: 200, end: 100 }]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not allow blackout period with negative start time', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					blackoutPeriods: [{ start: -100, end: 100 }]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not allow blackout period with zero start time', async function () {
			let errorOccurred = false
			try {
				await UserModel.create({
					...testUserFields,
					blackoutPeriods: [{ start: 0, end: 100 }]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})
	})

	describe('Password Updates', function () {
		it('should hash new password when password is modified', async function () {
			const user = await UserModel.create(testUserFields)
			const originalHash = user.password

			user.password = 'newPassword123'
			await user.save()

			expect(user.password).to.not.equal('newPassword123')
			expect(user.password).to.not.equal(originalHash)
			expect(user.passwordResetCode).to.be.undefined
		})
	})
})
