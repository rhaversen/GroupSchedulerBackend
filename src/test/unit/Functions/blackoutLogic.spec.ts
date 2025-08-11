/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai'
import { describe, it } from 'mocha'

import { mergeBlackoutPeriods, addAndMergeBlackoutPeriod, removeFromBlackoutPeriods } from '../../../app/controllers/userController.js'

describe('Blackout Logic Functions', function () {
	describe('mergeBlackoutPeriods', function () {
		it('should return empty array for empty input', function () {
			const result = mergeBlackoutPeriods([])
			expect(result).to.be.an('array').that.is.empty
		})

		it('should return single period unchanged', function () {
			const periods = [{ start: 100, end: 200 }]
			const result = mergeBlackoutPeriods(periods)
			expect(result).to.deep.equal(periods)
		})

		it('should merge overlapping periods', function () {
			const periods = [{ start: 100, end: 200 }, { start: 150, end: 300 }]
			const result = mergeBlackoutPeriods(periods)
			expect(result).to.deep.equal([{ start: 100, end: 300 }])
		})

		it('should merge adjacent periods', function () {
			const periods = [{ start: 100, end: 200 }, { start: 200, end: 300 }]
			const result = mergeBlackoutPeriods(periods)
			expect(result).to.deep.equal([{ start: 100, end: 300 }])
		})

		it('should not merge separate periods', function () {
			const periods = [{ start: 100, end: 200 }, { start: 300, end: 400 }]
			const result = mergeBlackoutPeriods(periods)
			expect(result).to.deep.equal([{ start: 100, end: 200 }, { start: 300, end: 400 }])
		})

		it('should handle unsorted periods', function () {
			const periods = [{ start: 300, end: 400 }, { start: 100, end: 200 }]
			const result = mergeBlackoutPeriods(periods)
			expect(result).to.deep.equal([{ start: 100, end: 200 }, { start: 300, end: 400 }])
		})

		it('should merge multiple overlapping periods into one', function () {
			const periods = [
				{ start: 100, end: 200 },
				{ start: 150, end: 250 },
				{ start: 225, end: 300 }
			]
			const result = mergeBlackoutPeriods(periods)
			expect(result).to.deep.equal([{ start: 100, end: 300 }])
		})
	})

	describe('addAndMergeBlackoutPeriod', function () {
		it('should add new period to empty array', function () {
			const newPeriod = { start: 100, end: 200 }
			const result = addAndMergeBlackoutPeriod([], newPeriod)
			expect(result).to.deep.equal([newPeriod])
		})

		it('should merge overlapping periods when adding', function () {
			const existing = [{ start: 100, end: 200 }, { start: 150, end: 300 }]
			const newPeriod = { start: 250, end: 400 }
			const result = addAndMergeBlackoutPeriod(existing, newPeriod)
			expect(result).to.deep.equal([{ start: 100, end: 400 }])
		})

		it('should add separate period without merging', function () {
			const existing = [{ start: 100, end: 200 }]
			const newPeriod = { start: 300, end: 400 }
			const result = addAndMergeBlackoutPeriod(existing, newPeriod)
			expect(result).to.deep.equal([{ start: 100, end: 200 }, { start: 300, end: 400 }])
		})

		it('should bridge gap between existing periods', function () {
			const existing = [{ start: 100, end: 200 }, { start: 400, end: 500 }]
			const newPeriod = { start: 180, end: 420 }
			const result = addAndMergeBlackoutPeriod(existing, newPeriod)
			expect(result).to.deep.equal([{ start: 100, end: 500 }])
		})
	})

	describe('removeFromBlackoutPeriods', function () {
		it('should return empty array when removing from empty array', function () {
			const deleteRange = { start: 100, end: 200 }
			const result = removeFromBlackoutPeriods([], deleteRange)
			expect(result).to.be.an('array').that.is.empty
		})

		it('should split period when deleting from middle', function () {
			const existing = [{ start: 100, end: 500 }]
			const deleteRange = { start: 200, end: 300 }
			const result = removeFromBlackoutPeriods(existing, deleteRange)
			expect(result).to.deep.equal([
				{ start: 100, end: 200 },
				{ start: 300, end: 500 }
			])
		})

		it('should trim beginning of period', function () {
			const existing = [{ start: 100, end: 500 }]
			const deleteRange = { start: 50, end: 200 }
			const result = removeFromBlackoutPeriods(existing, deleteRange)
			expect(result).to.deep.equal([{ start: 200, end: 500 }])
		})

		it('should trim end of period', function () {
			const existing = [{ start: 100, end: 500 }]
			const deleteRange = { start: 300, end: 600 }
			const result = removeFromBlackoutPeriods(existing, deleteRange)
			expect(result).to.deep.equal([{ start: 100, end: 300 }])
		})

		it('should completely remove period', function () {
			const existing = [{ start: 100, end: 500 }]
			const deleteRange = { start: 50, end: 600 }
			const result = removeFromBlackoutPeriods(existing, deleteRange)
			expect(result).to.be.an('array').that.is.empty
		})

		it('should leave periods untouched when delete range does not overlap', function () {
			const existing = [{ start: 100, end: 200 }, { start: 300, end: 400 }]
			const deleteRange = { start: 250, end: 275 }
			const result = removeFromBlackoutPeriods(existing, deleteRange)
			expect(result).to.deep.equal(existing)
		})

		it('should handle multiple periods with partial overlaps', function () {
			const existing = [
				{ start: 100, end: 200 },
				{ start: 250, end: 350 },
				{ start: 400, end: 500 }
			]
			const deleteRange = { start: 150, end: 450 }
			const result = removeFromBlackoutPeriods(existing, deleteRange)
			expect(result).to.deep.equal([
				{ start: 100, end: 150 },
				{ start: 450, end: 500 }
			])
		})
	})
})
