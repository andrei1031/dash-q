# VIP Price Fix TODO

## Plan: Fix hardcoded VIP price defaults so admin changes propagate to customer view

### Steps:

- [ ] 1. Fix settingsController.js: Remove hardcoded '100' defaults in get_single_setting for vip_price
- [ ] 2. Fix customerController.js: Replace hardcoded vipFee=100 with DB fetch
- [ ] 3. Restart backend server (cd dash-q-v2-back && npm start or node server.js)
- [ ] 4. Test: Admin set VIP=150 → Customer toggle shows ₱150
- [ ] 5. Verify DB: SELECT \* FROM app_settings WHERE key='vip_price';

## Steps:

- [x] 1. Fix settingsController.js: Remove hardcoded '100' defaults in get_single_setting for vip_price
- [ ] 2. Fix customerController.js: Replace hardcoded vipFee=100 with DB fetch
- [ ] 3. Restart backend server (cd dash-q-v2-back && npm start or node server.js)
- [ ] 4. Test: Admin set VIP=150 → Customer toggle shows ₱150
- [ ] 5. Verify DB: SELECT \* FROM app_settings WHERE key='vip_price';

**Current Progress: Completed Step 1 & 2**
