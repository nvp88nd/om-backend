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
npm run start:dev
```

## API co ban
- `GET /health`: kiem tra backend dang song.
- `GET /user/get-all`: lay danh sach user demo.
- `GET /user/get-by-id/:id`: lay user theo id.
- `POST /user/create`: tao user demo.

Body mau:
```json
{
  "username": "new-user",
  "email": "new-user@example.com"
}
```

## Ghi chu
- `UserModule` hien tai la in-memory de test ket noi frontend-backend.
- Co the thay bang repository TypeORM khi chot schema DB.
