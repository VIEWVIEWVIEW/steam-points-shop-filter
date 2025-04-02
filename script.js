(async () => {
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  const xpath = expression => {
    const snapshot = document.evaluate(expression, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    return Array.from({ length: snapshot.snapshotLength }, (_, i) => snapshot.snapshotItem(i));
  };

  const galleryXPath = '/html/body/div[1]/div[7]/div[6]/div[3]/div/div/div[2]/div/div/div[1]/div[2]/div/div/div';
  let galleryRoot = xpath(galleryXPath)[0];
  if (!galleryRoot) return alert('⚠️ Gallery XPath invalid! Check again.');

  const selectItems = () => [...galleryRoot.querySelectorAll('[role="button"].Focusable')];
  const setBorder = (el, color) => el.style.border = `4px solid ${color}`;

  let checked = 0, previousTotal = -1;

  console.log('🚀 Starting checks...');

  while (true) {
    const items = selectItems();
    const totalItems = items.length;

    if (previousTotal === totalItems) {
      console.log('✅ Finished checking all items.');
      break;
    }

    for (; checked < totalItems; checked++) {
      const item = items[checked];
      item.scrollIntoView({ behavior: 'instant', block: 'center' });
      item.click();

      // Quickly wait for modal
      const modal = await new Promise(resolve => {
        let attempts = 0;
        const interval = setInterval(() => {
          const el = document.querySelector('div.FullModalOverlay dialog[open]');
          if (el || ++attempts > 30) { clearInterval(interval); resolve(el); }
        }, 40);
      });

      if (!modal) {
        console.warn(`⚠️ Modal failed at item ${checked + 1}.`);
        continue;
      }

      await sleep(5); // minimal sleep for content stability

      const modalText = modal.textContent.toLowerCase();
      let borderColor = 'green';

      if (modalText.includes('you need to own')) {
        borderColor = 'red';
        console.log(`🔴 #${checked + 1}: Cannot buy (Ownership Required)`);
      } else if (modalText.includes('equip now')) {
        borderColor = 'blue';
        console.log(`🔵 #${checked + 1}: Already owned (Equip Now)`);
      } else {
        console.log(`🟢 #${checked + 1}: Can Buy`);
      }

      setBorder(item, borderColor);

      const cancel = [...modal.querySelectorAll('button')]
        .find(btn => btn.textContent.trim().toLowerCase() === 'cancel');
      if (cancel) cancel.click();
      else document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 27 }));

      await sleep(10);

      if ((checked + 1) % 20 === 0) {
        console.log('⬇️ Scrolling to bottom to trigger loading new items...');
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(2350); // Give Steam time to load
      }
    }

    previousTotal = totalItems;

    // Confirm no further items are loading
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2350);
  }

  console.log(`🎉 All done! Checked ${checked} items.`);
})();
