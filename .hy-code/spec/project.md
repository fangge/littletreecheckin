# Project: 成就丛林 (Achievement Jungle)

## Overview
A gamified habit-tracking app for children, managed by parents. Children complete daily tasks to grow virtual trees in their "forest," earning fruits (currency) to redeem rewards. Parents monitor progress, approve tasks, and send encouraging messages.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS v4 + motion/react
- **Backend**: Node.js + Express (to be implemented)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth or JWT-based custom auth
- **Package Manager**: pnpm

## Core Domain Concepts
- **Parent**: Account holder who manages children, approves tasks, sets rewards
- **Child**: A child profile under a parent account; completes tasks, earns fruits
- **Tree**: A virtual tree tied to a goal/habit; grows as tasks are completed
- **Goal**: A habit or task the child commits to (e.g., "brush teeth daily")
- **Task**: A daily check-in instance of a goal; requires parent approval
- **Fruit**: In-app currency earned by completing tasks
- **Medal**: Achievement badge unlocked by reaching milestones
- **Reward**: Items/activities redeemable with fruits (managed by parent)
- **Message**: Communication between parent and child within the app

## Key User Flows
1. Parent registers → adds children → sets goals/rewards
2. Child checks in daily tasks → uploads proof (image)
3. Parent reviews and approves/rejects tasks
4. Approved tasks grow the child's tree and award fruits
5. Child redeems fruits for rewards in the store
6. Milestones unlock medals/achievements

## Conventions
- All API routes prefixed with `/api/v1/`
- Authentication via JWT Bearer tokens
- Supabase used for database (PostgreSQL) and file storage
- Frontend calls backend REST API (no direct Supabase client in frontend)
- TypeScript throughout (frontend and backend)
- Error responses follow `{ error: string, code?: string }` format
- Success responses follow `{ data: T, message?: string }` format