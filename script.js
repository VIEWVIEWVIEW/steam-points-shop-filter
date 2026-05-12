(async () => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

    const CONTROL_ID = "steam-points-shop-filter-controls";
    const CHECKED_ATTR = "data-spsf-checked";
    const CHECKING_ATTR = "data-spsf-checking";

    document.getElementById(CONTROL_ID)?.remove();

    const style = document.createElement("style");
    style.textContent = `
        div.FullModalOverlay,
        div.FullModalOverlay dialog,
        dialog[open]::backdrop {
            pointer-events: none !important;
        }

        div.FullModalOverlay dialog > *,
        div.FullModalOverlay dialog button,
        dialog[open] > *,
        dialog[open] button {
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(style);

    const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        return !!el.offsetParent && rect.width > 0 && rect.height > 0;
    };

    const isItemCard = (el) => {
        if (!isVisible(el) || el.tagName !== "DIV") return false;

        const rect = el.getBoundingClientRect();
        const text = (el.textContent || "").trim();

        return rect.width >= 100
            && rect.height >= 100
            && text.length > 0
            && !el.closest(`#${CONTROL_ID}`);
    };

    const getItems = () => {
        const selector = '[role="button"].Focusable,[role="button"][class*="Focusable"],.Focusable[role="button"]';
        return Array.from(document.querySelectorAll(selector)).filter(isItemCard);
    };

    const getPendingItems = () => getItems().filter((item) =>
            !item.hasAttribute(CHECKED_ATTR) && !item.hasAttribute(CHECKING_ATTR)
        );

    const markBorder = (el, color) => {
        el.style.boxSizing = "border-box";
        el.style.border = `4px solid ${color}`;
    };

    const modalSelector = 'div.FullModalOverlay dialog[open], dialog[open]';
    const getOpenModal = () => document.querySelector(modalSelector);

    const waitForModalOpen = async (timeoutMs = 1500) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const modal = getOpenModal();
            if (modal) return modal;
            await sleep(50);
        }

        return null;
    };

    const waitForModalClose = async (timeoutMs) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (!getOpenModal()) return true;
            await sleep(50);
        }

        return !getOpenModal();
    };

    const closeModal = async (modal) => {
        const closeBtn = [...modal.querySelectorAll("button")]
            .find((x) => /^(cancel|close|later|ok|done)$/i.test((x.textContent || "").trim()));

        if (closeBtn) {
            closeBtn.click();
        } else {
            document.dispatchEvent(new KeyboardEvent("keydown", {
                key: "Escape",
                code: "Escape",
                keyCode: 27,
                which: 27,
                bubbles: true
            }));
        }

        if (await waitForModalClose(3500)) return true;

        window.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            which: 27,
            bubbles: true
        }));

        if (typeof modal.close === "function") {
            try {
                modal.close();
            } catch {
                // Steam may own the dialog lifecycle; fall back to waiting below.
            }
        }

        return waitForModalClose(1500);
    };

    let isRunning = false;
    let hasStarted = false;
    let isProcessing = false;
    let checkScheduled = false;
    let pendingCheck = false;
    let autoLoopActive = false;
    let mode = "manual";
    let modalDelay = 20;
    let batchDelay = 1300;
    let checkedCount = 0;

    const controls = document.createElement("div");
    controls.id = CONTROL_ID;
    Object.assign(controls.style, {
        position: "fixed",
        top: "10px",
        left: "10px",
        zIndex: 2147483647,
        fontFamily: "Arial, sans-serif"
    });

    const btn = document.createElement("button");
    Object.assign(btn.style, {
        padding: "8px 15px",
        fontWeight: "bold",
        borderRadius: "5px",
        border: "none",
        background: "#800",
        color: "#fff",
        cursor: "pointer"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
        background: "#222",
        color: "#fff",
        padding: "10px",
        borderRadius: "5px",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        fontSize: "12px",
        marginTop: "8px"
    });

    const appendRow = (labelText, control) => {
        const row = document.createElement("div");
        row.style.marginTop = "4px";
        const label = document.createElement("label");
        label.textContent = labelText;
        row.appendChild(label);
        row.appendChild(control);
        panel.appendChild(row);
        return row;
    };

    const modeSelect = document.createElement("select");
    modeSelect.innerHTML = `
        <option value="manual">Manual scroll</option>
        <option value="auto">Autoscroll</option>
    `;
    modeSelect.value = mode;
    modeSelect.style.width = "120px";
    appendRow("Mode: ", modeSelect);

    const modalDelayInput = document.createElement("input");
    modalDelayInput.type = "number";
    modalDelayInput.value = String(modalDelay);
    modalDelayInput.min = "0";
    modalDelayInput.style.width = "70px";
    appendRow("Modal Delay (ms): ", modalDelayInput);

    const batchDelayInput = document.createElement("input");
    batchDelayInput.type = "number";
    batchDelayInput.value = String(batchDelay);
    batchDelayInput.min = "0";
    batchDelayInput.style.width = "70px";
    appendRow("Batch Delay (ms): ", batchDelayInput);

    const status = document.createElement("div");
    status.style.marginTop = "6px";
    panel.appendChild(status);

    const updateBtn = document.createElement("button");
    updateBtn.textContent = "Update Delays";
    Object.assign(updateBtn.style, {
        padding: "5px 10px",
        marginTop: "6px",
        borderRadius: "3px",
        border: "none",
        background: "#444",
        color: "#fff",
        cursor: "pointer"
    });
    panel.appendChild(updateBtn);

    controls.appendChild(btn);
    controls.appendChild(panel);
    document.body.appendChild(controls);

    const updateStatus = () => {
        btn.textContent = isRunning ? "PAUSE CHECKER" : (hasStarted ? "RESUME CHECKER" : "START CHECKER");
        btn.style.background = isRunning ? "#1677ff" : "#800";
        status.textContent = `${isRunning ? "Running" : "Paused"} | ${mode === "auto" ? "Autoscroll" : "Manual scroll"} | Checked: ${checkedCount}`;
    };

    const checkItem = async (item) => {
        if (!isRunning || !item || !item.isConnected || item.hasAttribute(CHECKED_ATTR)) return false;

        item.setAttribute(CHECKING_ATTR, "1");

        try {
            const leftoverModal = getOpenModal();
            if (leftoverModal) await closeModal(leftoverModal);

            item.click();
            let modal = await waitForModalOpen();

            if (!modal) {
                item.scrollIntoView({ block: "center", behavior: "auto" });
                item.click();
                modal = await waitForModalOpen(2000);
            }

            if (!modal) {
                item.setAttribute(CHECKED_ATTR, "failed");
                console.warn("Modal failed to open for item:", (item.textContent || "").trim());
                return false;
            }

            await sleep(modalDelay);

            if (!isRunning) {
                await closeModal(modal);
                return false;
            }

            const modalText = (modal.textContent || "").toLowerCase();
            const cannotBuy = /you need to own|requires ownership|must own/i.test(modalText);
            const alreadyHave = /equip now|already owned|you own this/i.test(modalText);

            if (cannotBuy) {
                markBorder(item, "red");
                console.log(`Item #${checkedCount + 1}: Cannot buy`);
            } else if (alreadyHave) {
                markBorder(item, "blue");
                console.log(`Item #${checkedCount + 1}: Already owned`);
            } else {
                markBorder(item, "green");
                console.log(`Item #${checkedCount + 1}: Can buy`);
            }

            item.setAttribute(CHECKED_ATTR, "1");
            checkedCount += 1;
            updateStatus();

            if (!(await closeModal(modal))) {
                console.warn(`Item #${checkedCount}: Modal did not close cleanly.`);
            }

            return true;
        } finally {
            item.removeAttribute(CHECKING_ATTR);
        }
    };

    const processPendingItems = async () => {
        if (!isRunning || isProcessing) {
            pendingCheck = true;
            return;
        }

        isProcessing = true;

        try {
            do {
                pendingCheck = false;
                const items = getPendingItems();

                if (items.length === 0) break;

                for (const item of items) {
                    if (!isRunning) return;
                    await checkItem(item);
                }
            } while (pendingCheck && isRunning);
        } finally {
            isProcessing = false;
        }
    };

    const scheduleCheck = () => {
        if (!isRunning) return;

        if (isProcessing) {
            pendingCheck = true;
            return;
        }

        if (checkScheduled) return;

        checkScheduled = true;
        setTimeout(async () => {
            checkScheduled = false;
            await processPendingItems();
        }, 150);
    };

    const runAutoscrollLoop = async () => {
        if (autoLoopActive) return;

        autoLoopActive = true;

        try {
            let lastTotal = -1;
            let unchangedBatches = 0;

            while (isRunning && mode === "auto") {
                await processPendingItems();
                if (!isRunning || mode !== "auto") break;

                const total = getItems().length;
                if (total === lastTotal) {
                    unchangedBatches += 1;
                } else {
                    unchangedBatches = 0;
                    lastTotal = total;
                }

                if (unchangedBatches >= 2 && getPendingItems().length === 0) {
                    console.log(`All done. Total checked: ${checkedCount}.`);
                    setRunning(false);
                    break;
                }

                window.scrollTo({ top: document.body.scrollHeight });
                await sleep(batchDelay);
            }
        } finally {
            autoLoopActive = false;
        }
    };

    function setRunning(next) {
        const wasStarted = hasStarted;
        isRunning = next;
        if (next) hasStarted = true;
        updateStatus();

        if (isRunning) {
            console.log(wasStarted ? "Checker resumed." : "Checker started.");
            scheduleCheck();
            if (mode === "auto") runAutoscrollLoop();
        } else {
            console.log("Checker paused.");
            const modal = getOpenModal();
            if (modal) closeModal(modal);
        }
    }

    btn.onclick = () => setRunning(!isRunning);

    modeSelect.onchange = () => {
        mode = modeSelect.value;
        updateStatus();
        console.log(`Mode changed to: ${mode === "auto" ? "autoscroll" : "manual scroll"}`);

        if (!isRunning) return;
        if (mode === "auto") {
            runAutoscrollLoop();
        } else {
            scheduleCheck();
        }
    };

    updateBtn.onclick = () => {
        modalDelay = Math.max(0, parseInt(modalDelayInput.value, 10) || 20);
        batchDelay = Math.max(0, parseInt(batchDelayInput.value, 10) || 1300);
        console.log(`Updated delays: modal=${modalDelay}ms, batch=${batchDelay}ms`);
    };

    let scrollTimer = null;
    window.addEventListener("scroll", () => {
        if (!isRunning || mode !== "manual") return;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(scheduleCheck, 250);
    }, { passive: true });

    const observer = new MutationObserver((mutations) => {
        if (!isRunning || mode !== "manual") return;

        if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
            scheduleCheck();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    updateStatus();
    console.log("Checker loaded in paused mode. Click START CHECKER to begin.");
})();
