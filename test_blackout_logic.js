// Quick test of blackout period logic
// This is a standalone test file to verify the logic works correctly

// Simulate the ITimeRange interface
const testCases = [
    {
        name: "Basic merge - overlapping periods",
        existing: [{ start: 100, end: 200 }, { start: 150, end: 300 }],
        newPeriod: { start: 250, end: 400 },
        expectedMerged: [{ start: 100, end: 400 }]
    },
    {
        name: "No overlap - separate periods",
        existing: [{ start: 100, end: 200 }],
        newPeriod: { start: 300, end: 400 },
        expectedMerged: [{ start: 100, end: 200 }, { start: 300, end: 400 }]
    },
    {
        name: "Adjacent periods - should merge",
        existing: [{ start: 100, end: 200 }],
        newPeriod: { start: 200, end: 300 },
        expectedMerged: [{ start: 100, end: 300 }]
    },
    {
        name: "Bridge gap - three periods merge",
        existing: [{ start: 100, end: 200 }, { start: 400, end: 500 }],
        newPeriod: { start: 180, end: 420 },
        expectedMerged: [{ start: 100, end: 500 }]
    }
];

const deleteCases = [
    {
        name: "Split period - delete from middle",
        existing: [{ start: 100, end: 500 }],
        deleteRange: { start: 200, end: 300 },
        expected: [{ start: 100, end: 200 }, { start: 300, end: 500 }]
    },
    {
        name: "Trim beginning",
        existing: [{ start: 100, end: 500 }],
        deleteRange: { start: 50, end: 200 },
        expected: [{ start: 200, end: 500 }]
    },
    {
        name: "Trim end",
        existing: [{ start: 100, end: 500 }],
        deleteRange: { start: 300, end: 600 },
        expected: [{ start: 100, end: 300 }]
    },
    {
        name: "Complete removal",
        existing: [{ start: 100, end: 500 }],
        deleteRange: { start: 50, end: 600 },
        expected: []
    }
];

// Copy the functions from the controller here for testing
function mergeBlackoutPeriods(periods) {
    if (periods.length <= 1) {
        return periods;
    }

    const sorted = periods.slice().sort((a, b) => a.start - b.start);
    const merged = [];

    for (const current of sorted) {
        if (merged.length === 0) {
            merged.push(current);
        } else {
            const last = merged[merged.length - 1];
            
            if (current.start <= last.end) {
                last.end = Math.max(last.end, current.end);
            } else {
                merged.push(current);
            }
        }
    }

    return merged;
}

function addAndMergeBlackoutPeriod(existingPeriods, newPeriod) {
    const allPeriods = [...existingPeriods, newPeriod];
    return mergeBlackoutPeriods(allPeriods);
}

function removeFromBlackoutPeriods(existingPeriods, deleteRange) {
    const result = [];

    for (const period of existingPeriods) {
        if (deleteRange.end <= period.start || deleteRange.start >= period.end) {
            result.push(period);
        } else {
            if (deleteRange.start <= period.start && deleteRange.end >= period.end) {
                continue;
            }
            
            if (deleteRange.start > period.start && deleteRange.end < period.end) {
                result.push({ start: period.start, end: deleteRange.start });
                result.push({ start: deleteRange.end, end: period.end });
            }
            else if (deleteRange.start <= period.start && deleteRange.end < period.end) {
                result.push({ start: deleteRange.end, end: period.end });
            }
            else if (deleteRange.start > period.start && deleteRange.end >= period.end) {
                result.push({ start: period.start, end: deleteRange.start });
            }
        }
    }

    return result;
}

// Test merge cases
console.log("=== TESTING MERGE LOGIC ===");
testCases.forEach(test => {
    const result = addAndMergeBlackoutPeriod(test.existing, test.newPeriod);
    const passed = JSON.stringify(result) === JSON.stringify(test.expectedMerged);
    console.log(`${test.name}: ${passed ? "PASS" : "FAIL"}`);
    if (!passed) {
        console.log(`  Expected: ${JSON.stringify(test.expectedMerged)}`);
        console.log(`  Got:      ${JSON.stringify(result)}`);
    }
});

// Test delete cases
console.log("\n=== TESTING DELETE LOGIC ===");
deleteCases.forEach(test => {
    const result = removeFromBlackoutPeriods(test.existing, test.deleteRange);
    const passed = JSON.stringify(result) === JSON.stringify(test.expected);
    console.log(`${test.name}: ${passed ? "PASS" : "FAIL"}`);
    if (!passed) {
        console.log(`  Expected: ${JSON.stringify(test.expected)}`);
        console.log(`  Got:      ${JSON.stringify(result)}`);
    }
});
