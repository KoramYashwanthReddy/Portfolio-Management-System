# Portfolio Management System

Spring Boot based portfolio platform with a public-facing personal website and a secured admin console for managing portfolio content.

The application exposes REST APIs for portfolio data, authentication, file uploads, contact messages, and dashboard metrics. It also serves a polished static frontend that reads from the same backend.

---

## 📖 Table of Contents
1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Recent Upgrades & Dynamic Features](#recent-upgrades--dynamic-features)
4. [Tech Stack](#tech-stack)
5. [Project Architecture](#project-architecture)
6. [Database Schema & JPA Entities](#database-schema--jpa-entities)
7. [API Reference](#api-reference)
8. [Configuration & Environment Variables](#configuration--environment-variables)
9. [Run Locally](#run-locally)
10. [Run Tests](#run-tests)
11. [Security & Stateless Authentication](#security--stateless-authentication)

---

## Overview

This project is designed to help a developer present and manage a professional portfolio from one place. It includes:
- A public website for showcasing about information, skills, projects, certifications, and resume details.
- An admin area for maintaining content without changing the frontend code.
- JWT-based authentication with access and refresh tokens.
- Password reset and password change flows.
- File storage for resumes and other uploaded assets.
- Swagger/OpenAPI documentation for exploring the API.

---

## Key Features

- **Public Portfolio Homepage**: Fully dynamic website loaded with live backend database content.
- **Project Catalog**: Interactive grid with full-text search, category pill filtering, status filters, sorting options, pagination, and featured items.
- **Dynamic Content Sections**: Live skills metrics, verification-linked certifications, and download-ready resumes.
- **Visitor Communication**: Integrated contact/feedback channels delivering messages directly to the admin dashboard.
- **Secure Admin Panel**: Responsive layout for managing profile metadata, uploading certificates, starring projects, and editing technical skill points.
- **File Upload Engine**: Handles PDF documents and image assets securely using categorized uploads.

---

## Recent Upgrades & Dynamic Features

This section highlights the advanced frontend interactions and responsive design systems added recently:

### 1. Multi-Directional Staggered Marquee
* **Double-Row Marquee**: Refactored the technology banner into two rows scrolling in opposite directions (Row 1 left, Row 2 right).
* **Vibrant Styling**: Large tech labels (`2.2rem`) separated by bright violet dots (`var(--accent)`).
* **Fade Masks**: Smooth side fading using CSS gradient masking (`mask-image: linear-gradient(...)`) so keywords fade gracefully at the viewport boundaries.

### 2. Live "Currently Building" Card Overlay
* **Automated JPA Status Sync**: Links the profile card overlay pill directly to the database. It dynamically queries your project records and selects the first project marked with `status = "IN_PROGRESS"`.
* **Designation Fallback**: Automatically displays your default professional title if no project is currently in the active development phase.

### 3. Glassmorphic Aura Background
* **Living Neon Backdrops**: Added a multicolor pulsing glow (Indigo -> Violet -> Rose pink) behind the profile card.
* **Organic Pulse Keyframes**: Animations slowly resize and translation-shift the glows (`profileGlowPulse`) to breathe life into the landing screen.

### 4. Interactive Image Lightbox
* **Fullscreen Lightbox Gallery**: Custom JS engine mapping all screenshot thumbnails and hero media to a fullscreen overlay.
* **Backdrop Filters**: Uses glass blur filters, zoom transitions, keyboard Escape hooks, and body scroll prevention for an immersive viewer experience.

### 5. Responsive Top Nav Header
* **Mobile Breakpoint Adaptability**: Transforms the vertical dashboard admin sidebar into a sticky horizontal mobile navigation bar on smaller viewports.
* **Swipe-to-Scroll Links**: Standardized navigation pill decks for mobile screens with circular responsive utility buttons.

---

## Tech Stack

* **Backend Core**: Java 17, Spring Boot 3.5.4
* **Security & Auth**: Spring Security, JJWT (JSON Web Tokens)
* **Persistence**: Spring Data JPA, Hibernate, MySQL, H2 (for unit and integration tests)
* **API Documentation**: Springdoc OpenAPI, Swagger UI
* **Frontend**: Vanilla HTML5, CSS3 (Custom design systems, custom media queries, variables), Modern ES6 JavaScript

---

## Project Architecture

The codebase adheres to a modular, layered clean architecture:

```
src/main/java/com/yashwanth/portfolio/
├── controller/        # REST Controllers exposing public and admin API endpoints
├── service/           # Service interfaces describing business logic rules
│   └── impl/          # JPA-backed implementations of the service layer
├── entity/            # JPA Entities mapped to MySQL database tables
├── repository/        # Spring Data JPA Repository definitions
├── security/          # Security filters, CORS configurations, and JWT token utilities
├── dto/               # Data Transfer Objects for clean request/response serialization
└── exception/         # Centralized global handler converting errors to structured JSON
```

The frontend assets are contained within:
```
src/main/resources/
├── static/            # SPA web root serving HTML templates
│   ├── admin/         # Admin console HTML views
│   └── assets/        # Shared assets
│       ├── css/       # UI styling (global.css, dashboard.css, components.css, responsive.css)
│       └── js/        # Application engines (main.js, admin.js)
```

---

## Database Schema & JPA Entities

* **`About`**: Manages profile metadata, bios, experience counters, designations, and social media handles.
* **`Project`**: Core project records, category fields, GitHub links, completion dates, and display state flags.
* **`ProjectNotes`**: Detailed project diaries or release logs linked to parent projects, featuring status groupings.
* **`Skill`**: Stores technical skills, categories, proficiency percentages, and display orders.
* **`Certification`**: Stores verified credentials, issuer badges, issue dates, expiry details, and file references.
* **`FileEntity`**: File entity mapping disk files to URLs, restricting file uploads to allowed content types (images/PDFs).
* **`Message`**: Stores incoming inquiries (names, subjects, emails, body, read status, starred flags).

---

## API Reference

### Public APIs
* `GET /api/v1/public/about` - Fetch profile biography and summary details.
* `GET /api/v1/public/dashboard` - Retrieve aggregated public homepage metrics.
* `GET /api/v1/public/projects` - Paginated catalog with parameters for search, category, status, and sorting.
* `GET /api/v1/public/projects/featured` - Fetch starred/selected portfolio items.
* `GET /api/v1/public/certifications` - Fetch list of active certificates.
* `GET /api/v1/public/resume/download` - Stream PDF resume file.
* `POST /api/v1/public/contact` - Submit contact messages.

### Authentication APIs
* `POST /api/v1/auth/login` - Authenticate and retrieve Access + Refresh tokens.
* `POST /api/v1/auth/refresh` - Swap refresh token for new access tokens.
* `POST /api/v1/auth/logout` - Invalidate session.
* `POST /api/v1/auth/forgot-password` - Request password recovery email.
* `POST /api/v1/auth/reset-password` - Submit new password with validation token.

### Admin APIs (Protected)
* `GET|PUT /api/v1/admin/about` - View/Update biography profile info.
* `GET|POST|PUT|DELETE /api/v1/admin/skills` - CRUD endpoints for technical skill metrics.
* `GET|POST|PUT|DELETE /api/v1/admin/projects` - CRUD endpoints for portfolio project entries.
* `GET|POST|PUT|DELETE /api/v1/admin/certifications` - CRUD endpoints for credentials.
* `GET|PATCH|DELETE /api/v1/admin/messages` - Retrieve, star, archive, or delete inbox inquiries.

---

## Configuration & Environment Variables

Create or configure `src/main/resources/application.properties` with the following variables:

```properties
# MySQL Datasource Connection
spring.datasource.url=jdbc:mysql://localhost:3306/portfolio_db?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=your_mysql_password

# JWT Security Config
app.security.jwt.secret=your_super_secret_base64_encoded_jwt_key_with_at_least_256_bits
app.security.jwt.access-token-expiration-ms=900000
app.security.jwt.refresh-token-expiration-ms=604800000

# Mail Configuration (SMTP)
spring.mail.host=smtp.example.com
spring.mail.port=587
spring.mail.username=your_email@example.com
spring.mail.password=your_email_password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# Initial Admin Seeding Data
app.admin.email=admin@example.com
app.admin.password=SecureAdminPassword123
app.admin.name=Koram Yashwanth Reddy

# Local Upload Directory Path
app.file.upload-dir=./uploads
```

---

## Run Locally

1. **Verify Prerequisites**: Java 17+, Maven 3.8+, MySQL 8+ installed and running.
2. **Build Project**:
   ```bash
   ./mvnw clean package
   ```
3. **Execute Application**:
   ```bash
   ./mvnw spring-boot:run
   ```
4. **Access Endpoints**:
   * Home Landing Webpage: [http://localhost:8080/](http://localhost:8080/)
   * Admin Login Console: [http://localhost:8080/admin/login.html](http://localhost:8080/admin/login.html)
   * Swagger Documentation Panel: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

---

## Run Tests

Execute the automated test suite covering authentication filters, JWT validation logic, and entity CRUD transactions using H2:
```bash
./mvnw test
```

---

## Security & Stateless Authentication

* **Stateless Architecture**: CSRF protection is disabled; sessions are entirely stateless, relying on client-side JWT authorization headers.
* **Token Handshake**: Login grants a short-lived Access Token and a long-lived HTTP-only Refresh Token.
* **Granular Whitelist**: Public routes (landing pages, public download folders, Swagger paths) are explicitly bypassed in the security filters. All admin dashboards and operations require authenticated credentials.
