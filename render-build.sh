#!/bin/bash
# Build script for Render deployment
# This builds both the frontend (Vite) and the backend (TypeScript) in one go.

echo "==> Installing frontend dependencies (including devDependencies)..."
npm install --include=dev

echo "==> Building frontend (Vite)..."
npx vite build

echo "==> Installing backend dependencies (including devDependencies)..."
cd server
npm install --include=dev

echo "==> Building backend (TypeScript)..."
npx tsc

echo "==> Build complete!"
