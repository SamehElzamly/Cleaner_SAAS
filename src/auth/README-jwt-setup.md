# JWT Access/Refresh Setup — ملاحظات مهمة

## 1. باكدجات لازم تتثبت
```bash
npm install @nestjs/jwt passport-jwt
npm install -D @types/passport-jwt
```

## 2. Environment variables (.env)
```
JWT_ACCESS_SECRET=your-strong-access-secret
JWT_REFRESH_SECRET=your-strong-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```
لازم الـ secrets تكون مختلفة عن بعض، وطويلة/عشوائية (استخدم مثلاً `openssl rand -hex 32`).

## 4. إزاي تستخدم الـ endpoints
- `POST /auth/login` → بيرجع `{ user, accessToken, refreshToken }`
- `GET /auth/verify` مع `Authorization: Bearer <accessToken>` → يتأكد إن التوكن صالح ويرجع بيانات اليوزر
- `POST /auth/refresh` مع `Authorization: Bearer <refreshToken>` → يرجع access/refresh tokens جداد (فيه rotation، يعني كل refresh بيغير الـ refreshTokenHash المخزن)
- `POST /auth/logout` مع `Authorization: Bearer <accessToken>` → بيمسح الـ refreshTokenHash من الداتابيز

## 5. ملاحظة أمان
دلوقتي بنستخدم `passport-jwt` مع `ExtractJwt.fromAuthHeaderAsBearerToken()`، يعني التوكنات بتتبعت في الـ `Authorization` header. لو حابب تستخدم httpOnly cookies بدل كده (أأمن ضد XSS)، قولي وأعدلها.
