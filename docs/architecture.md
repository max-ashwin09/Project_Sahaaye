# SAHAAYE System Architecture

## Overview
SAHAAYE is a multi-tier platform designed for resilience, privacy, and community safety.

```
+--------------------+        +---------------------+
|   Web (React/Vite) |        | Android Native App  |
+---------+----------+        +----------+----------+
          |                              |
          +---------------+--------------+
                          | HTTPS / WSS
                          v
               +----------+-----------+
               |  Nginx / Edge Proxy  |
               +----------+-----------+
                          |
                          v
               +----------+-----------+
               |   Express Backend    |
               | (Security Middleware)|
               +----+-----------+-----+
                    |           |
       Internal Net |           | Redis BullMQ
                    v           v
    +---------------+----+   +--+---------------+
    | PostgreSQL+PostGIS |   | AI Microservices |
    +--------------------+   +------------------+
```
