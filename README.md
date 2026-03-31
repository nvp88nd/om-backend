# KLTN Backend

Backend su dung NestJS.

## Yeu cau
- Node.js 20+
- MySQL 8+ (neu su dung DB that)

## Cai dat
```bash
npm install
```

## Bien moi truong
1. Tao file `.env` tu `.env.example`.
2. Cap nhat gia tri ket noi DB va CORS.

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=kltn
```

## Chay local
```bash
npm run dev
```