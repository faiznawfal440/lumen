# Lumen

Lumen is a responsive light-novel reading platform built from the approved Figma Make design.

## Current baseline

- React 19 + TypeScript + Vite
- Responsive desktop/mobile UI
- Home, semantic search, reader, and AI Studio prototype views
- Reader themes, bookmark interaction, table of contents, and knowledge panel
- Supabase client bootstrap (credentials supplied through environment variables)

## Local development

1. Install dependencies.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and publishable key.
4. Run `npm run dev`.

## Product build order

1. Supabase project + database schema
2. Authentication
3. Novel / volume / chapter data
4. PDF storage and upload
5. Processing jobs + AI pipeline
6. Reader progress and bookmarks
7. Semantic search + embeddings
8. Human review + publish workflow

Never commit secrets or service-role keys to the repository.
