import test from "node:test";
import assert from "node:assert/strict";
import * as frontendSort from "../../wafa-frentend/src/utils/examSessionSort.js";
import {
    compareSessionNames,
    parseSessionInfo,
    sortGroupedQuestions,
} from "../utils/examSessionSort.js";

for (const [name, sorter] of Object.entries({
    backend: { compareSessionNames, parseSessionInfo, sortGroupedQuestions },
    frontend: frontendSort,
})) {
    test(`${name}: mixed abbreviated and full years sort chronologically`, () => {
        const labels = ["2024 normale", "16 normale", "17 normale", "18 normale", "24 ratt", "2023 normale", "18 ratt", "Session principale"];
        const expected = ["2024 normale", "24 ratt", "2023 normale", "18 normale", "18 ratt", "17 normale", "16 normale", "Session principale"];
        assert.deepEqual([...labels].sort(sorter.compareSessionNames), expected);
        const groups = Object.fromEntries(labels.map(label => [label, [{ _id: label }]]));
        const sorted = sorter.sortGroupedQuestions(groups);
        assert.deepEqual(Object.keys(sorted), expected);
        for (const label of labels) assert.strictEqual(sorted[label], groups[label]);
    });

    test(`${name}: short years do not turn unrelated numbers into dates`, () => {
        for (const label of ["16 normale", " 16 NORMALE ", "16 - ratt", "16"]) {
            assert.equal(sorter.parseSessionInfo(label).year, 2016);
        }
        for (const label of ["L16", "Cours 16", "16 questions", "116 normale"]) {
            assert.equal(sorter.parseSessionInfo(label).year, 0);
        }
        assert.equal(sorter.parseSessionInfo("16 normale 2024").year, 2024);
        assert.equal(sorter.parseSessionInfo("1999 normale").year, 1999);
    });
}

test("parses session years and types accurately", () => {
    assert.deepEqual(parseSessionInfo("2026 ratt"), {
        year: 2026,
        sessionRank: 20,
        str: "2026 ratt",
    });

    assert.deepEqual(parseSessionInfo("2025 normal"), {
        year: 2025,
        sessionRank: 10,
        str: "2025 normal",
    });

    assert.deepEqual(parseSessionInfo("Session Principale 2024"), {
        year: 2024,
        sessionRank: 10,
        str: "Session Principale 2024",
    });

    assert.deepEqual(parseSessionInfo("Session Rattrapage 2024"), {
        year: 2024,
        sessionRank: 20,
        str: "Session Rattrapage 2024",
    });

    assert.deepEqual(parseSessionInfo("Session générale"), {
        year: 0,
        sessionRank: 50,
        str: "Session générale",
    });
});

test("sorts the exact user timeline in strict descending chronological order", () => {
    const rawSessions = [
        "2024 ratt",
        "2025 normal",
        "2025 ratt",
        "2026 ratt",
        "2024 normal",
        "2022 ratt",
        "2018 normal",
        "2017 normal",
    ];

    const sorted = [...rawSessions].sort(compareSessionNames);

    const expected = [
        "2026 ratt",
        "2025 normal",
        "2025 ratt",
        "2024 normal",
        "2024 ratt",
        "2022 ratt",
        "2018 normal",
        "2017 normal",
    ];

    assert.deepEqual(sorted, expected);
});

test("sortGroupedQuestions reconstructs an object with keys in chronological descending order", () => {
    const grouped = {
        "2024 ratt": [1, 2],
        "2025 normal": [3, 4],
        "2025 ratt": [5, 6],
        "2026 ratt": [7, 8],
        "2024 normal": [9, 10],
    };

    const sortedObj = sortGroupedQuestions(grouped);

    assert.deepEqual(Object.keys(sortedObj), [
        "2026 ratt",
        "2025 normal",
        "2025 ratt",
        "2024 normal",
        "2024 ratt",
    ]);

    assert.deepEqual(sortedObj["2026 ratt"], [7, 8]);
    assert.deepEqual(sortedObj["2024 normal"], [9, 10]);
});

test("places undated sessions at the end", () => {
    const sessions = ["Session principale", "2024 normal", "2025 ratt"];
    const sorted = sessions.sort(compareSessionNames);
    assert.deepEqual(sorted, ["2025 ratt", "2024 normal", "Session principale"]);
});
