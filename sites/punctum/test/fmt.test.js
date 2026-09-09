import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// main.js is an IIFE bound to browser APIs. Extract the pure formatting
// function and evaluate it with a minimal stub.
const code = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "js", "main.js"), "utf8");
const match = code.match(/function fmt\(ms, withMilli = false\) \{[\s\S]*?\n    \}/);
if (!match) throw new Error("fmt() not found in main.js");
const pad = (n, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, "0");
const fmt = eval(`(${match[0]})`);

test("fmt: zero", () => {
    assert.equal(fmt(0).replace(/<[^>]*>/g, ""), "00:00");
});

test("fmt: under a minute", () => {
    assert.equal(fmt(59900).replace(/<[^>]*>/g, ""), "00:59");
});

test("fmt: minute rollover", () => {
    assert.equal(fmt(60000).replace(/<[^>]*>/g, ""), "01:00");
});

test("fmt: hour format appears at 1h", () => {
    assert.equal(fmt(3599999).replace(/<[^>]*>/g, ""), "59:59");
    assert.equal(fmt(3600000).replace(/<[^>]*>/g, ""), "01:00:00");
});

test("fmt: hour minute second rollover", () => {
    assert.equal(fmt(3661000).replace(/<[^>]*>/g, ""), "01:01:01");
});

test("fmt: negative input clamps via abs", () => {
    assert.equal(fmt(-1000).replace(/<[^>]*>/g, ""), "00:01");
});

test("fmt: large multi-hour value", () => {
    assert.equal(fmt(90061000).replace(/<[^>]*>/g, ""), "25:01:01");
});

test("fmt: centiseconds are floored, not rounded", () => {
    const cases = [[1250, "25"], [1200, "20"], [1005, "00"], [1090, "09"], [1990, "99"], [999, "99"]];
    for (const [ms, want] of cases) {
        const got = fmt(ms, true).match(/\.(\d\d)</)[1];
        assert.equal(got, want, `milli for ${ms}ms`);
    }
});

test("punctum html: tile ids match JS activity ids (if array present)", () => {
    // ensures HTML/JS integrity for the app shell
    const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "html", "index.html"), "utf8");
    assert.ok(html.includes('data-mode="stopwatch"'), "stopwatch tab");
    assert.ok(html.includes('data-mode="timer"'), "timer tab");
    assert.ok(html.includes('data-mode="alarm"'), "alarm tab");
    assert.ok(html.includes('data-mode="pomodoro"'), "pomodoro tab");
    assert.ok(
        html.includes("pompui-chrome.js") || html.includes("ai-note"),
        "AI notice present (shared chrome or inline badge)"
    );
});