import test from "node:test";
import assert from "node:assert/strict";
import {
    compareSessionNames,
    parseSessionInfo,
    sortGroupedQuestions,
} from "../utils/examSessionSort.js";

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
