# SAHAAYE (सहाय)

> **A Secure, Privacy-Preserving Humanitarian & Community Aid Platform**  
> SAHAAYE is an AI-powered social seva platform connecting real-world needs with people willing to help. It enables location-based discovery, photo/video reporting, smart search, AI-powered category suggestions, and face blurring for privacy, using a shared backend for Web and Android apps.

## Key Features
- **Privacy First (DPDP Act 2023 Compliant)**: Purpose-wise consent records, right to data erasure, data export, and dedicated grievance redressal.
- **Location Safety**: Coordinates are automatically fuzzed for the public; exact locations are only unlocked for verified helpers.
- **Media Protection**: Auto-stripping of EXIF GPS metadata and automatic face-blurring pipeline to safeguard vulnerable individuals and children.
- **Trust & Anti-Abuse**: In-app private messaging, scam detection, helper/NGO verification, and an active moderation & appeals system.
- **Hardened Security**: Strict OWASP controls, IDOR prevention middleware, non-root Docker execution, and rate limiting.

## Project Structure
- `frontend/` - React/Vite responsive web app with strict Content Security Policy.
- `android/` - Native Android application with encrypted keystores and restricted network security config.
- `backend/` - Node.js TypeScript modular API with built-in security middleware.
- `ai-services/` - Internal microservices for face blurring, minor detection, duplicate detection, and content moderation.
- `database/` - PostgreSQL schemas, PostGIS spatial queries, and compliance migration scripts.
- `shared/` - Shared TypeScript types, validation schemas, and domain constants.
- `docs/` - Comprehensive technical architecture, safety policies, and DPDP compliance documentation.
