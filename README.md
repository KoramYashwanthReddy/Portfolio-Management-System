# Portfolio Management System

Spring Boot based portfolio platform with a public-facing personal website and a secured admin console for managing portfolio content.

The application exposes REST APIs for portfolio data, authentication, file uploads, contact messages, and dashboard metrics. It also serves a polished static frontend that reads from the same backend.

## Overview

This project is designed to help a developer present and manage a professional portfolio from one place. It includes:

- A public website for showcasing about information, skills, projects, certifications, and resume details.
- An admin area for maintaining content without changing the frontend code.
- JWT-based authentication with access and refresh tokens.
- Password reset and password change flows.
- File storage for resumes and other uploaded assets.
- Swagger/OpenAPI documentation for exploring the API.

## Key Features

- Public portfolio homepage with live backend content.
- Project catalog with search, filtering, sorting, pagination, and featured project support.
- Skills, certifications, resume, and about sections managed from the backend.
- Contact form for receiving messages from visitors.
- Secure admin dashboard for CRUD operations on portfolio content.
- Multipart file upload support for resumes and media assets.
- JWT security with stateless sessions and role-protected admin routes.
- Email support for password recovery flows.
- Global JSON error handling and consistent API responses.

## Tech Stack

- Java 17
- Spring Boot 3.5.4
- Spring Web
- Spring Data JPA
- Spring Security
- Spring Validation
- Spring Mail
- MySQL
- H2 for tests
- JJWT for token handling
- springdoc-openapi for API docs
- Maven

## Project Structure

- `src/main/java/com/yashwanth/portfolio/controller` - REST controllers for public and admin features.
- `src/main/java/com/yashwanth/portfolio/service` - business logic and service contracts.
- `src/main/java/com/yashwanth/portfolio/service/impl` - service implementations.
- `src/main/java/com/yashwanth/portfolio/entity` - JPA entities.
- `src/main/java/com/yashwanth/portfolio/repository` - Spring Data repositories.
- `src/main/java/com/yashwanth/portfolio/security` - JWT and Spring Security configuration.
- `src/main/java/com/yashwanth/portfolio/dto` - request and response models.
- `src/main/resources/static` - public site and admin UI assets.
- `src/test/java` - integration and application tests.

## Main Modules

### Public APIs

- `GET /api/v1/public/about`
- `GET /api/v1/public/dashboard`
- `GET /api/v1/public/skills`
- `GET /api/v1/public/projects`
- `GET /api/v1/public/projects/featured`
- `GET /api/v1/public/projects/{id}`
- `GET /api/v1/public/certifications`
- `GET /api/v1/public/resume`
- `GET /api/v1/public/resume/download`
- `POST /api/v1/public/contact`
- `GET /api/v1/public/files/{id}/download`

### Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/validate`

### Admin APIs

- `GET /api/v1/admin/dashboard`
- `GET|PUT /api/v1/admin/about`
- `GET|POST|PUT|DELETE /api/v1/admin/skills`
- `GET|POST|PUT|DELETE /api/v1/admin/projects`
- `GET|POST|PUT|DELETE /api/v1/admin/certifications`
- `GET|POST /api/v1/admin/resume`
- `POST /api/v1/admin/files`
- `GET|PATCH|DELETE /api/v1/admin/messages`

## Prerequisites

- Java 17 or newer
- Maven 3.9+ or the included Maven Wrapper
- MySQL 8+
- SMTP credentials for password reset email delivery

## Configuration

The application reads its configuration from `src/main/resources/application.properties`.

Update the following values for your environment:

- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`
- `spring.mail.host`
- `spring.mail.port`
- `spring.mail.username`
- `spring.mail.password`
- `app.security.jwt.secret`
- `app.admin.email`
- `app.admin.password`
- `app.admin.name`
- `app.file.upload-dir`

Notes:

- The application runs with a context path of `/api/v1`.
- Uploaded files are stored in the directory defined by `app.file.upload-dir`.
- Allowed upload types are restricted to images and PDFs.

## Run Locally

1. Clone the repository.
2. Create the MySQL database, or allow the application to create it automatically.
3. Update `src/main/resources/application.properties` with your local credentials.
4. Start the application:

```bash
./mvnw spring-boot:run
```

On Windows:

```bash
mvnw.cmd spring-boot:run
```

Open the application at:

- Public site: `http://localhost:8080/api/v1/`
- Swagger UI: `http://localhost:8080/api/v1/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/api/v1/v3/api-docs`

## Run Tests

```bash
./mvnw test
```

The test profile uses an in-memory H2 database and a separate test admin user.

## Authentication Summary

- Login returns an access token and a refresh token.
- Access tokens are used in the `Authorization: Bearer <token>` header.
- Refresh tokens can be exchanged for new tokens.
- Admin endpoints require authentication.
- The security layer is stateless and backed by JWT filters.

## File Handling

- Resume uploads are handled as multipart form data.
- General file uploads are supported from the admin area.
- Public downloads stream files directly from storage with the correct content type.

## API Response Format

Most endpoints return a consistent wrapper structure:

- `success`
- `message`
- `data`

This makes the frontend and any external client easier to integrate.

## Frontend Notes

The static frontend is served from `src/main/resources/static` and includes:

- A public landing page.
- Admin login and dashboard pages.
- Client-side scripts for fetching portfolio data from the backend.
- Responsive styling, theme toggling, and animation support.

## Testing

The repository includes integration coverage for:

- Login, token refresh, and current-user profile flow.
- Unauthorized request handling.
- Public API behavior.

## Security Notes

- CSRF is disabled because the API is stateless and JWT-based.
- Public endpoints are explicitly whitelisted.
- Password reset and login-lock logic are built into the authentication service.
- For production, externalize secrets instead of keeping them in source control.

## License

No license has been defined in this repository yet.
