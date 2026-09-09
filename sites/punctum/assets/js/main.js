(function () {
    "use strict";

    /* ============================================================
     * Punctum — precise timing core.
     * All modes compute from Date.now() (wall-monotonic anchor),
     * never by accumulating setInterval ticks, so timers stay
     * accurate even if the tab is throttled or backgrounded.
     * ============================================================ */

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const pad = (n, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, "0");

    function fmt(ms, withMilli = false) {
        const total = Math.floor(Math.abs(ms));
        const h = Math.floor(total / 3600000);
        const m = Math.floor((total % 3600000) / 60000);
        const s = Math.floor((total % 60000) / 1000);
        const base = h > 0
            ? `${pad(h)}:${pad(m)}:${pad(s)}`
            : `${pad(m)}:${pad(s)}`;
        if (!withMilli) return base;
        const milli = Math.floor((total % 1000) / 10);
        return `${base}<span class="display__milli">.${pad(milli)}</span>`;
    }

    function fmtPlain(ms) {
        return fmt(ms).replace(/<[^>]*>/g, "");
    }

    function beep(pattern) {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const seq = pattern || [[880, 0], [880, 0.25], [880, 0.5]];
            seq.forEach(([freq, at]) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.001, ctx.currentTime + at);
                gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.22);
                osc.connect(gain).connect(ctx.destination);
                osc.start(ctx.currentTime + at);
                osc.stop(ctx.currentTime + at + 0.25);
            });
            setTimeout(() => ctx.close(), 1600);
        } catch { /* audio unavailable — visual flash still fires */ }
    }

    function flashScreen() {
        const f = $("[data-flash]");
        if (!f) return;
        f.classList.remove("is-active");
        void f.offsetWidth;
        f.classList.add("is-active");
    }

    function toast(msg, ms = 3500) {
        const t = $("[data-toast]");
        if (!t) return;
        t.textContent = msg;
        t.hidden = false;
        window.clearTimeout(t._hide);
        t._hide = window.setTimeout(() => { t.hidden = true; }, ms);
    }

    /* ---------- mode tabs ---------- */

    const tabs = $$("[data-mode]");
    const panels = Object.fromEntries($$("[data-panel]").map((p) => [p.dataset.panel, p]));

    const activateMode = (mode) => {
        tabs.forEach((t) => {
            const on = t.dataset.mode === mode;
            t.classList.toggle("is-active", on);
            t.setAttribute("aria-pressed", String(on));
        });
        Object.entries(panels).forEach(([id, el]) => {
            el.hidden = id !== mode;
        });
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            activateMode(tab.dataset.mode);
            try { localStorage.setItem("punctum-last-mode", tab.dataset.mode); } catch { /* storage blocked */ }
        });
    });

    // Restore the last used mode (localStorage, per browser)
    try {
        const savedMode = localStorage.getItem("punctum-last-mode");
        if (savedMode && panels[savedMode]) activateMode(savedMode);
    } catch { /* storage blocked — default tab */ }

    /* ============================================================
     * STOPWATCH
     * ============================================================ */

    const sw = {
        running: false,
        anchor: 0,       // Date.now() at last (re)start
        elapsed: 0,      // accumulated ms before last pause
        raf: 0,
        laps: [],
        display: $("[data-stopwatch-display]"),
        toggle: $("[data-stopwatch-toggle]"),
        lapBtn: $("[data-stopwatch-lap]"),
        resetBtn: $("[data-stopwatch-reset]"),
        list: $("[data-stopwatch-laps]")
    };

    const swCurrent = () => sw.elapsed + (sw.running ? Date.now() - sw.anchor : 0);

    function swRender() {
        sw.display.innerHTML = fmt(swCurrent(), true);
        if (sw.running) sw.raf = requestAnimationFrame(swRender);
    }

    function swUpdateButtons() {
        sw.toggle.textContent = sw.running ? "Pause" : (sw.elapsed ? "Weiter" : "Start");
        sw.toggle.classList.toggle("is-running", sw.running);
        sw.lapBtn.disabled = !sw.running;
        sw.resetBtn.disabled = sw.running || !sw.elapsed;
    }

    sw.toggle.addEventListener("click", () => {
        if (sw.running) {
            sw.elapsed += Date.now() - sw.anchor;
            sw.running = false;
            cancelAnimationFrame(sw.raf);
        } else {
            sw.anchor = Date.now();
            sw.running = true;
            sw.raf = requestAnimationFrame(swRender);
        }
        swUpdateButtons();
        swRender();
    });

    sw.lapBtn.addEventListener("click", () => {
        const now = swCurrent();
        const prev = sw.laps.length ? sw.laps[sw.laps.length - 1].total : 0;
        sw.laps.push({ total: now, split: now - prev });
        const li = document.createElement("li");
        const idx = document.createElement("span");
        const val = document.createElement("b");
        idx.textContent = `Runde ${pad(sw.laps.length)}`;
        val.textContent = `+${fmtPlain(sw.laps[sw.laps.length - 1].split)} · ${fmtPlain(now)}`;
        li.append(idx, val);
        sw.list.prepend(li);
    });

    sw.resetBtn.addEventListener("click", () => {
        sw.running = false;
        sw.elapsed = 0;
        sw.laps = [];
        sw.list.replaceChildren();
        cancelAnimationFrame(sw.raf);
        swUpdateButtons();
        swRender();
    });

    swUpdateButtons();
    swRender();

    /* ============================================================
     * TIMER
     * ============================================================ */

    const timer = {
        running: false,
        endAt: 0,       // Date.now() based deadline
        remaining: 5 * 60000,
        raf: 0,
        display: $("[data-timer-display]"),
        toggle: $("[data-timer-toggle]"),
        resetBtn: $("[data-timer-reset]"),
        inputs: { h: $("[data-timer-h]"), m: $("[data-timer-m]"), s: $("[data-timer-s]") },
        inputsWrap: $("[data-timer-inputs]")
    };

    const clampInt = (el, max) => {
        const v = Math.max(0, Math.min(max, parseInt(el.value, 10) || 0));
        el.value = v;
        return v;
    };

    function timerFromInputs() {
        timer.remaining =
            clampInt(timer.inputs.h, 23) * 3600000 +
            clampInt(timer.inputs.m, 59) * 60000 +
            clampInt(timer.inputs.s, 59) * 1000;
        try {
            localStorage.setItem("punctum-timer-inputs", JSON.stringify({
                h: Number(timer.inputs.h.value) || 0,
                m: Number(timer.inputs.m.value) || 0,
                s: Number(timer.inputs.s.value) || 0
            }));
        } catch { /* storage blocked */ }
        timerRender();
    }

    function timerRender() {
        timer.display.textContent = fmtPlain(Math.max(0, timer.remaining));
    }

    function timerUpdateButtons() {
        timer.toggle.textContent = timer.running ? "Pause" : "Start";
        timer.toggle.classList.toggle("is-running", timer.running);
        timer.resetBtn.disabled = !timer.running && timer.remaining === timerFromInputsSilent();
        timer.inputsWrap.querySelectorAll("input").forEach((i) => { i.disabled = timer.running; });
    }

    function timerFromInputsSilent() {
        return (parseInt(timer.inputs.h.value, 10) || 0) * 3600000 +
               (parseInt(timer.inputs.m.value, 10) || 0) * 60000 +
               (parseInt(timer.inputs.s.value, 10) || 0) * 1000;
    }

    function timerTick() {
        if (!timer.running) return;
        timer.remaining = timer.endAt - Date.now();
        if (timer.remaining <= 0) {
            timer.remaining = 0;
            timer.running = false;
            timerRender();
            timerUpdateButtons();
            timer.display.classList.add("is-done");
            setTimeout(() => timer.display.classList.remove("is-done"), 2200);
            beep();
            flashScreen();
            toast("Timer abgelaufen ⏱");
            return;
        }
        timerRender();
        timer.raf = requestAnimationFrame(timerTick);
    }

    timer.toggle.addEventListener("click", () => {
        if (timer.running) {
            timer.remaining = Math.max(0, timer.endAt - Date.now());
            timer.running = false;
            cancelAnimationFrame(timer.raf);
        } else {
            if (timer.remaining <= 0) timerFromInputs();
            if (timer.remaining <= 0) return;
            timer.endAt = Date.now() + timer.remaining;
            timer.running = true;
            timer.raf = requestAnimationFrame(timerTick);
        }
        timerUpdateButtons();
        timerRender();
    });

    timer.resetBtn.addEventListener("click", () => {
        timer.running = false;
        cancelAnimationFrame(timer.raf);
        timerFromInputs();
        timerUpdateButtons();
    });

    [timer.inputs.h, timer.inputs.m, timer.inputs.s].forEach((input) => {
        input.addEventListener("input", () => {
            if (!timer.running) {
                timerFromInputs();
                timerUpdateButtons();
            }
        });
    });

    $$("[data-timer-presets] [data-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (timer.running) return;
            timer.inputs.h.value = 0;
            timer.inputs.m.value = Math.floor(Number(btn.dataset.preset) / 60);
            timer.inputs.s.value = Number(btn.dataset.preset) % 60;
            timerFromInputs();
            timerUpdateButtons();
        });
    });

    // Restore last timer inputs (localStorage, per browser)
    try {
        const saved = JSON.parse(localStorage.getItem("punctum-timer-inputs") || "null");
        if (saved && typeof saved === "object") {
            if (typeof saved.h === "number") timer.inputs.h.value = saved.h;
            if (typeof saved.m === "number") timer.inputs.m.value = saved.m;
            if (typeof saved.s === "number") timer.inputs.s.value = saved.s;
        }
    } catch { /* defaults */ }

    timerFromInputs();
    timerUpdateButtons();

    /* ============================================================
     * ALARM
     * ============================================================ */

    const alarm = {
        list: $("[data-alarm-list]"),
        empty: $("[data-alarm-empty]"),
        clock: $("[data-alarm-clock]"),
        timeInput: $("[data-alarm-time]"),
        setBtn: $("[data-alarm-set]"),
        alarms: [],   // { id, hh, mm, nextFire: Date.now(), triggered: false }
        timer: 0
    };

    function alarmLoad() {
        try {
            return JSON.parse(localStorage.getItem("punctum-alarms") || "[]");
        } catch { return []; }
    }

    function alarmSave() {
        try {
            localStorage.setItem("punctum-alarms", JSON.stringify(alarm.alarms));
        } catch { /* storage blocked — alarms stay for the session */ }
    }

    function nextFireFor(hh, mm) {
        const now = new Date();
        const next = new Date();
        next.setHours(hh, mm, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        return next.getTime();
    }

    function alarmRender() {
        alarm.list.replaceChildren();
        alarm.empty.hidden = alarm.alarms.length > 0;
        alarm.alarms.sort((a, b) => a.nextFire - b.nextFire).forEach((a) => {
            const li = document.createElement("li");
            const time = document.createElement("span");
            time.textContent = `${pad(a.hh)}:${pad(a.mm)}`;
            const del = document.createElement("button");
            del.type = "button";
            del.textContent = "Entfernen";
            del.setAttribute("aria-label", `Alarm ${pad(a.hh)}:${pad(a.mm)} entfernen`);
            del.addEventListener("click", () => {
                alarm.alarms = alarm.alarms.filter((x) => x.id !== a.id);
                alarmSave();
                alarmRender();
            });
            li.append(time, del);
            alarm.list.append(li);
        });
    }

    function alarmClockTick() {
        const now = new Date();
        alarm.clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        alarm.alarms.forEach((a) => {
            if (a.nextFire <= Date.now() && !a.triggered) {
                a.triggered = true;
                beep([[880, 0], [1100, 0.25], [880, 0.5], [1100, 0.75]]);
                flashScreen();
                toast(`🔔 Alarm ${pad(a.hh)}:${pad(a.mm)}!`);
            }
            if (a.triggered && Date.now() - a.nextFire > 60000) {
                a.nextFire = nextFireFor(a.hh, a.mm);
                a.triggered = false;
                alarmSave();
                alarmRender();
            }
        });
    }

    alarm.setBtn.addEventListener("click", () => {
        const [hh, mm] = (alarm.timeInput.value || "").split(":").map(Number);
        if (Number.isNaN(hh) || Number.isNaN(mm)) {
            toast("Bitte eine gültige Zeit wählen.");
            return;
        }
        alarm.alarms.push({ id: Date.now(), hh, mm, nextFire: nextFireFor(hh, mm), triggered: false });
        alarmSave();
        alarmRender();
        toast(`Alarm ${pad(hh)}:${pad(mm)} gesetzt ✓`);
    });

    alarm.alarms = alarmLoad().filter((a) => typeof a.hh === "number" && typeof a.mm === "number");
    alarm.alarms.forEach((a) => {
        a.nextFire = nextFireFor(a.hh, a.mm);
        a.triggered = false;
    });
    alarmRender();
    alarm.timer = setInterval(alarmClockTick, 1000);
    alarmClockTick();

    /* ============================================================
     * POMODORO
     * ============================================================ */

    const pomo = {
        running: false,
        endAt: 0,
        remaining: 25 * 60000,
        phase: "focus",            // focus | short | long
        round: 1,
        config: { focus: 25, short: 5, long: 15, rounds: 4 },
        raf: 0,
        display: $("[data-pomodoro-display]"),
        phaseEl: $("[data-pomodoro-phase]"),
        dot: $("[data-pomodoro-dot]"),
        roundEl: $("[data-pomodoro-round]"),
        progress: $("[data-pomodoro-progress]"),
        toggle: $("[data-pomodoro-toggle]"),
        skipBtn: $("[data-pomodoro-skip]"),
        resetBtn: $("[data-pomodoro-reset]")
    };

    function pomoPhaseMs() {
        const min = pomo.phase === "focus"
            ? pomo.config.focus
            : pomo.phase === "short" ? pomo.config.short : pomo.config.long;
        return min * 60000;
    }

    function pomoPhaseLabel() {
        if (pomo.phase === "focus") return "Fokus";
        return pomo.phase === "short" ? "Kurze Pause" : "Lange Pause";
    }

    function pomoRender() {
        pomo.display.textContent = fmtPlain(Math.max(0, pomo.remaining));
        pomo.display.classList.toggle("is-focus", pomo.phase === "focus");
        pomo.display.classList.toggle("is-break", pomo.phase !== "focus");
        pomo.phaseEl.textContent = pomoPhaseLabel();
        pomo.dot.classList.toggle("is-break", pomo.phase !== "focus");
        pomo.roundEl.textContent = `Runde ${pomo.round}`;
        const pct = Math.max(0, Math.min(100, 100 - (pomo.remaining / pomoPhaseMs()) * 100));
        pomo.progress.style.width = `${pct}%`;
    }

    function pomoUpdateButtons() {
        pomo.toggle.textContent = pomo.running ? "Pause" : "Start";
        pomo.toggle.classList.toggle("is-running", pomo.running);
        $$("[data-panel='pomodoro'] input").forEach((i) => { i.disabled = pomo.running; });
    }

    function pomoAdvance() {
        if (pomo.phase === "focus") {
            if (pomo.round >= pomo.config.rounds) {
                pomo.phase = "long";
            } else {
                pomo.phase = "short";
            }
        } else {
            pomo.phase = "focus";
            if (pomo.round >= pomo.config.rounds) {
                pomo.round = 1;
            } else {
                pomo.round += 1;
            }
        }
        pomo.remaining = pomoPhaseMs();
    }

    function pomoTick() {
        if (!pomo.running) return;
        pomo.remaining = pomo.endAt - Date.now();
        if (pomo.remaining <= 0) {
            pomo.remaining = 0;
            pomoRender();
            const finished = pomo.phase;
            pomoAdvance();
            pomo.running = false;
            pomoUpdateButtons();
            pomoRender();
            beep([[660, 0], [990, 0.3]]);
            flashScreen();
            toast(finished === "focus"
                ? "Fokus-Phase vorbei — Zeit für eine Pause! 🍅"
                : "Pause vorbei — zurück an die Arbeit!");
            return;
        }
        pomoRender();
        pomo.raf = requestAnimationFrame(pomoTick);
    }

    pomo.toggle.addEventListener("click", () => {
        if (pomo.running) {
            pomo.remaining = Math.max(0, pomo.endAt - Date.now());
            pomo.running = false;
            cancelAnimationFrame(pomo.raf);
        } else {
            if (pomo.remaining <= 0) pomo.remaining = pomoPhaseMs();
            pomo.endAt = Date.now() + pomo.remaining;
            pomo.running = true;
            pomo.raf = requestAnimationFrame(pomoTick);
        }
        pomoUpdateButtons();
        pomoRender();
    });

    pomo.skipBtn.addEventListener("click", () => {
        pomo.running = false;
        cancelAnimationFrame(pomo.raf);
        pomoAdvance();
        pomoUpdateButtons();
        pomoRender();
    });

    pomo.resetBtn.addEventListener("click", () => {
        pomo.running = false;
        cancelAnimationFrame(pomo.raf);
        pomo.phase = "focus";
        pomo.round = 1;
        pomo.remaining = pomoPhaseMs();
        pomoUpdateButtons();
        pomoRender();
    });

    const pomoInputs = {
        focus: $("[data-pomodoro-focus]"),
        short: $("[data-pomodoro-short]"),
        long: $("[data-pomodoro-long]"),
        rounds: $("[data-pomodoro-rounds]")
    };

    Object.entries(pomoInputs).forEach(([key, input]) => {
        input.addEventListener("change", () => {
            if (pomo.running) { input.value = pomo.config[key]; return; }
            pomo.config[key] = Math.max(1, parseInt(input.value, 10) || 1);
            input.value = pomo.config[key];
            if (pomo.phase === key || (key === "focus" && pomo.phase === "focus")) {
                pomo.remaining = pomoPhaseMs();
            }
            pomoRender();
        });
    });

    try {
        const saved = JSON.parse(localStorage.getItem("punctum-pomodoro-config") || "{}");
        Object.keys(pomo.config).forEach((k) => {
            if (typeof saved[k] === "number" && saved[k] > 0) pomo.config[k] = saved[k];
        });
        pomoInputs.focus.value = pomo.config.focus;
        pomoInputs.short.value = pomo.config.short;
        pomoInputs.long.value = pomo.config.long;
        pomoInputs.rounds.value = pomo.config.rounds;
    } catch { /* defaults */ }

    window.addEventListener("beforeunload", () => {
        try {
            localStorage.setItem("punctum-pomodoro-config", JSON.stringify(pomo.config));
        } catch { /* storage blocked — config stays for the session */ }
    });

    pomoUpdateButtons();
    pomoRender();

    /* ---------- keep displays correct across tab throttling ---------- */

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        if (sw.running) swRender();
        if (timer.running) timerTick();
        if (pomo.running) pomoTick();
        alarmClockTick();
    });
}());