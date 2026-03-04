#!/bin/bash
# Build script for Render deployment
# This builds both the frontend (Vite) and the backend (TypeScript) in one go.

echo "==> Installing frontend dependencies..."
npm install

echo "==> Building frontend (Vite)..."
npm run build

echo "==> Installing backend dependencies..."
cd server
npm install

echo "==> Building backend (TypeScript)..."
npm run build

echo "==> Build complete!"
