# Docker Setup cho Library Online

## Yêu cầu

- Docker Desktop hoặc Docker Engine đã được cài đặt
- Docker Compose (thường đi kèm với Docker Desktop)

## Cấu trúc

Docker Compose file bao gồm 2 services:

1. **PostgreSQL** (port 5433) - Database chính
2. **pgAdmin** (port 5050) - Web UI để quản lý database (optional)

## Cách sử dụng

### 1. Khởi động PostgreSQL

```bash
# Khởi động tất cả services (PostgreSQL + pgAdmin)
docker-compose up -d

# Hoặc chỉ khởi động PostgreSQL
docker-compose up -d postgres
```

### 2. Kiểm tra trạng thái

```bash
# Xem logs
docker-compose logs -f postgres

# Kiểm tra container đang chạy
docker-compose ps
```

### 3. Kết nối đến PostgreSQL

**Từ máy local:**
- Host: `localhost`
- Port: `5433`
- Database: `library_db`
- Username: `postgres`
- Password: `password`

**Connection String (đã có trong .env.example):**
```
postgresql+asyncpg://postgres:password@localhost:5433/library_db
```

### 4. Sử dụng pgAdmin (Optional)

Truy cập: http://localhost:5050

**Đăng nhập:**
- Email: `admin@library.com`
- Password: `admin`

**Thêm server trong pgAdmin:**
1. Click "Add New Server"
2. General tab:
   - Name: `Library DB`
3. Connection tab:
   - Host: `postgres` (tên service trong Docker network)
   - Port: `5432`
   - Database: `library_db`
   - Username: `postgres`
   - Password: `password`

### 5. Dừng services

```bash
# Dừng nhưng giữ data
docker-compose stop

# Dừng và xóa containers (data vẫn được giữ trong volumes)
docker-compose down

# Dừng và xóa tất cả (bao gồm cả data)
docker-compose down -v
```

## Quản lý Database

### Backup Database

```bash
# Backup toàn bộ database
docker-compose exec postgres pg_dump -U postgres library_db > backup.sql

# Backup với format custom (nén)
docker-compose exec postgres pg_dump -U postgres -Fc library_db > backup.dump
```

### Restore Database

```bash
# Restore từ SQL file
docker-compose exec -T postgres psql -U postgres library_db < backup.sql

# Restore từ custom format
docker-compose exec postgres pg_restore -U postgres -d library_db backup.dump
```

### Truy cập PostgreSQL CLI

```bash
# Vào psql shell
docker-compose exec postgres psql -U postgres -d library_db

# Chạy SQL command trực tiếp
docker-compose exec postgres psql -U postgres -d library_db -c "SELECT version();"
```

## Init Scripts

Bạn có thể thêm SQL scripts vào thư mục `init-scripts/` để tự động chạy khi database được khởi tạo lần đầu:

```bash
mkdir init-scripts
# Thêm các file .sql hoặc .sh vào thư mục này
```

Scripts sẽ được chạy theo thứ tự alphabet khi container được tạo lần đầu.

## Troubleshooting

### Port 5433 đã được sử dụng

Nếu port 5433 cũng bị chiếm dụng, bạn có thể đổi sang port khác:

1. Đổi port mapping trong `docker-compose.yml`:
   ```yaml
   ports:
     - "5434:5432"  # Sử dụng port 5434 hoặc port khác
   ```
2. Cập nhật DATABASE_URL trong `.env`:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5434/library_db
   ```

> **Lưu ý:** Port 5433 được sử dụng vì port 5432 đã bị chiếm bởi PostgreSQL local khác.

### Reset toàn bộ database

```bash
# Xóa tất cả containers và volumes
docker-compose down -v

# Khởi động lại
docker-compose up -d
```

### Xem logs chi tiết

```bash
# Logs của PostgreSQL
docker-compose logs -f postgres

# Logs của pgAdmin
docker-compose logs -f pgadmin
```

## Volumes

Data được lưu trong Docker volumes:
- `postgres_data`: Dữ liệu PostgreSQL
- `pgadmin_data`: Cấu hình pgAdmin

Để xem volumes:
```bash
docker volume ls | grep library
```

## Network

Services giao tiếp qua network `library_network`. Backend app của bạn có thể kết nối đến PostgreSQL thông qua:
- Từ host machine: `localhost:5433`
- Từ Docker container khác: `postgres:5432` (port bên trong container vẫn là 5432)
