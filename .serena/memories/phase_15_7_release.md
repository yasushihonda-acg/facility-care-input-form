# Phase 15.7 Release Information

## Status
- phase.15.7.status: implemented 2025-12-20, prod-verified

## API Changes

### recordConsumptionLog
- request: +remainingHandling, +remainingHandlingOther
- response: +inventoryDeducted, +wastedQuantity

### getConsumptionLogs
- response: +remainingHandling, +inventoryDeducted, +wastedQuantity

## Calculation Rules
- calc.rules: discarded=served, stored/other=consumed, 100%=served
- discarded: Deduct full served quantity from inventory
- stored/other: Deduct only consumed quantity from inventory
- 100% consumption: Deduct full served quantity, no waste

## UI Changes
- ui.staffRecordDialog.preview: quantityAfter, wastedQuantity

## E2E Tests
- e2e.phase15.7: STAFF-050, STAFF-051, STAFF-052, STAFF-053
- All tests passed on production

## Release Commits
- release.commits: ce07bf8, 708fcc1, 3923c82
