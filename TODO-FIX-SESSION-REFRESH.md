# Fix Session Persistence on Browser Refresh

## Steps:

- [✅] 1. Add axios interceptor in http-commons.js
- [✅] 2. Refactor App.js: Single initAuth() useEffect with localStorage→/me→session set
- [✅] 3. Null-safe logout in CustomerAppLayout.js, BarberAppLayout.js, AdminAppLayout.js

## ✅ IMPLEMENTATION COMPLETE

All steps done:

- ✅ Interceptor with localStorage fallback + 401 clear
- ✅ Single robust initAuth() in App.js: Supabase → /me (auto-token) → guest recovery
- ✅ Strict loading until auth settled
- ✅ Null-safe layouts
- ✅ Consolidated listeners

**Test Commands:**

```bash
# Terminal 1 (back)
cd dash-q-v2-back && npm start

# Terminal 2 (front)
cd dash-q-v2-front && npm start

# Login as customer/barber/guest → refresh browser → session persists
```

Task complete!
