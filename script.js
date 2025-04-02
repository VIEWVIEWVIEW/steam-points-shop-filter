(async () => {
    const sleep = ms => new Promise(res => setTimeout(res, ms));

    const xpath = (xp) => {
        const snap = document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        return Array.from({ length: snap.snapshotLength }, (_, i) => snap.snapshotItem(i));
    };

    // XPath to gallery
    const galleryXPath = '/html/body/div[1]/div[7]/div[6]/div[3]/div/div/div[2]/div/div/div[1]/div[2]/div/div/div';
    let galleryRoot = xpath(galleryXPath)[0];
    if (!galleryRoot) return alert("⚠️ Gallery XPath invalid, please re-check!");

    const markBorder = (el, color) => el.style.border = `4px solid ${color}`;
    const getItems = () => [...galleryRoot.querySelectorAll('[role="button"].Focusable')];

    let isPaused = false; // Initial state set to false

    // Setup Stop/Continue button (Persistent):
    let pauseResolve;
    const createPausePromise = () => new Promise(resolve => pauseResolve = resolve);

    const btn = document.createElement('button');
    btn.textContent = "RESUME CHECKER"; // Button text updated
    Object.assign(btn.style, {
        position: 'fixed', top: '10px', left: '10px', zIndex: 100001,
        padding: '8px 15px', fontWeight: 'bold', borderRadius: '5px',
        border: 'none', background: '#222', color: '#fff', cursor: 'pointer'
    });

    btn.onclick = () => {
        isPaused = !isPaused;
        btn.textContent = isPaused ? "RESUME CHECKER" : "PAUSE CHECKER"; // Change text based on state
        btn.style.background = isPaused ? '#800' : '#222';
        console.log(isPaused ? '⏸️ Checker Paused' : '▶️ Checker Resumed');
        if (!isPaused) pauseResolve();
    };
    document.body.appendChild(btn);

    // Delay configuration:
    let modalDelay = 20;  // Updated default
    let batchDelay = 1300; // Updated default

    const delayContainer = document.createElement('div');
    Object.assign(delayContainer.style, {
        position: 'fixed', top: '50px', left: '10px', zIndex: 100001,
        background: '#222', color: '#fff', padding: '10px', borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)'
    });

    const modalDelayInput = document.createElement('input');
    modalDelayInput.type = 'number';
    modalDelayInput.value = modalDelay; // Set default value to 20
    modalDelayInput.style.width = '50px';

    const batchDelayInput = document.createElement('input');
    batchDelayInput.type = 'number';
    batchDelayInput.value = batchDelay; // Set default value to 1300
    batchDelayInput.style.width = '50px';

    const updateBtn = document.createElement('button');
    updateBtn.textContent = 'Update Delays';
    Object.assign(updateBtn.style, {
        padding: '5px 10px', marginTop: '5px', borderRadius: '3px',
        border: 'none', background: '#444', color: '#fff', cursor: 'pointer'
    });

    updateBtn.onclick = () => {
        modalDelay = parseInt(modalDelayInput.value) || 20; // Keep default
        batchDelay = parseInt(batchDelayInput.value) || 1300; // Keep default
        console.log(`⏱️ Updated Delays: Modal Delay = ${modalDelay}ms, Batch Delay = ${batchDelay}ms`);
    };

    const delaysHTML = `
        <div>
          <label>Modal Delay (ms): </label>
          ${modalDelayInput.outerHTML}
        </div>
        <div>
          <label>Batch Delay (ms): </label>
          ${batchDelayInput.outerHTML}
        </div>
    `;

    delayContainer.innerHTML = delaysHTML;
    delayContainer.appendChild(updateBtn);
    document.body.appendChild(delayContainer);

    let checked = 0, lastTotal = -1;
    console.log('🚀 Checker has started.');

    while (true) {
        const items = getItems();
        const total = items.length;

        if (lastTotal === total) {
            console.log('✅ Finished checking all items.');
            break;
        }

        for (; checked < total; checked++) {
            if (isPaused) {
                console.log('⏸️ Paused... awaiting resume');
                await createPausePromise();  // Instant stop & wait when paused
            }

            const item = items[checked];
            item.scrollIntoView({ block: 'center', behavior: 'instant' });
            item.click();

            // Modal Open Check
            const modal = await new Promise(res => {
                let attempts = 0;
                const interval = setInterval(() => {
                    const dlg = document.querySelector('div.FullModalOverlay dialog[open]');
                    if (dlg || (++attempts > 30)) {
                        clearInterval(interval);
                        res(dlg);
                    }
                }, 50);
            });

            if (!modal) {
                console.warn(`⚠️ #${checked + 1}: Modal failed to open.`);
                continue;
            }

            await sleep(modalDelay);

            // Determine item status
            const modalText = modal.textContent.toLowerCase();
            const cannotBuy = modalText.includes('you need to own');
            const alreadyHave = modalText.includes('equip now');

            if (cannotBuy) {
                markBorder(item, 'red');
                console.log(`🔴 Item #${checked + 1}: Cannot buy`);
            } else if (alreadyHave) {
                markBorder(item, 'blue');
                console.log(`🔵 Item #${checked + 1}: Already owned`);
            } else {
                markBorder(item, 'green');
                console.log(`🟢 Item #${checked + 1}: Can buy`);
            }

            // Robust modal close button: "Cancel"/"Close"/"Later"
            const closeBtn = [...modal.querySelectorAll('button')]
                .find(x => /^(cancel|close|later)$/i.test(x.textContent.trim()));
            closeBtn?.click() || document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 27 }));

            await sleep(50);

            if ((checked + 1) % 10 === 0) {
                window.scrollTo({ top: document.body.scrollHeight });
                await sleep(batchDelay);
            }
        }

        lastTotal = total;
        window.scrollTo({ top: document.body.scrollHeight });
        await sleep(batchDelay);
    }

    console.log(`🎉 All done! Total checked: ${checked}.`);
})();
