# steam-points-shop-filter

The steam points shop doesn't filter out items, which aren't buyable with steam points (due to game ownership required). This script draws a red/green/blue box (can't buy/can buy/already owned) around all items in the gallery by iterating through all modals and scrolling down (hacky, but was the quickest way to implement this).

1. Simply go to the steam points shop and navigate to a "cluster" (aka "gallery"), e.g. https://store.steampowered.com/points/shop/c/backgrounds/cluster/3.
2. Then copy and paste the script from script.js into your browser console. Then wait a few minutes (or hours if you didn't add a search query) until all items are marked.
3. *hit pause/resume to pause/resume checking (duh!). the modal delay is the delay between checking if you can/cannot buy the background. you can probably keep this delay low as it's all on local data. the "batch delay" is the delay for scrolling down and loading new backgrounds from steam. this should be set higher, as this action performs a network request to steam.


## screenshots

![https://f003.backblazeb2.com/file/sharexxx/ShareX/2025/04/chrome_6RovH7JylgzDWPaS1O.png](https://f003.backblazeb2.com/file/sharexxx/ShareX/2025/04/chrome_6RovH7JylgzDWPaS1O.png)


[video (warning sound! cba to re-record)](https://f003.backblazeb2.com/file/sharexxx/ShareX/2025/04/chrome_TOHItBPK2bEdHqEkMd.mp4)
