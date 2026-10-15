# Backend Requests

## 1. Optional `location_label` Column on `disasters` Table
- **Context**: Citizen disaster reporting on the web records human-readable addresses (e.g. "Dhanmondi 27, Dhaka") alongside numeric latitude and longitude coordinates.
- **Current Schema**: The `disasters` table contains `latitude` and `longitude`, but does not currently include a `location_label` text column (unlike `resource_requests`, which has `location_label`).
- **Proposed Migration**:
  ```sql
  ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS location_label TEXT;
  ```
- **Web App Compatibility**: The web client currently stores the location address directly within the description (`Location: [Address] - [Description]`) to ensure seamless execution without schema changes.

## 2. Optional `purpose` Column on `disaster_media` Table
- **Context**: Disaster media rows can distinguish between user initial reports (`purpose: 'report'`) and volunteer field verification media (`purpose: 'verification'`).
- **Current Schema**: `disaster_media` table contains `id`, `disaster_id`, `file_url`, `media_type`, `uploaded_by`, and `created_at`. It lacks a `purpose` column.
- **Proposed Migration**:
  ```sql
  ALTER TABLE public.disaster_media ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'report';
  ```
- **Web App Compatibility**: The web client populates `uploaded_by` and omits `purpose` during insert to maintain schema compliance without breaking backend execution.

