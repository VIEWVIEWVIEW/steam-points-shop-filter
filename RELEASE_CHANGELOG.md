# Release Changelog

## What's Changed

- Fixed Steam Points Shop gallery detection after Steam page layout changes removed support for the old absolute XPath.
- Added a paused startup state so pasting the script only installs controls and does not immediately start opening modals.
- Added a mode selector:
  - `Manual scroll` checks currently loaded items when started and checks newly loaded items after manual scrolling.
  - `Autoscroll` keeps the previous automatic scroll-and-check workflow.
- Improved pause and resume controls, including a blue running-state `PAUSE CHECKER` button.
- Made Steam modal overlays click-through so the checker controls remain reachable while item modals are open.
- Improved modal open/close handling to reduce stale modal reads and prevent the script from continuing with the wrong item state.
- Fixed delay controls so updated modal and batch delay values are used while the checker is running.

## Notes

- Red border means the item cannot be bought because game ownership or another requirement is missing.
- Green border means the item can be bought with Steam Points.
- Blue border means the item is already owned.
