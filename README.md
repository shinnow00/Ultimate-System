# 🚀 Discord-Style Enterprise Task System

A comprehensive, role-based task management dashboard built with the visual identity of Discord. This system handles multiple departments (Design, Social, Ops, HR) with real-time features, permission gating, and complex workflow logic.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-green) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-blue)

## ✨ Features

### 🎨 The Designer Board (Core Logic)
- **Double-Validation System:** 
  - **Designers** can check off task parts (turns **Blue** / Pending).
  - **Visual Managers** double-check the work (turns **Green** / Approved).
- **Checklist System:** Dynamic addition of sub-tasks (Draft, Render, Polish).

### 📢 Social Media Hub
- **Content Grid:** Visual cards displaying Post Type, Platform (IG/TikTok/LinkedIn), and Tone of Voice (TOV).
- **Metadata:** Custom fields stored via JSONB in the database.

### 📦 Operations & Accounts
- **CRM Table:** Track clients, deal status, and feedback.
- **Logistics:** Convert closed deals into Ops tasks with Price and Shipping Location tracking.

### 👥 HR Portal
- **Attendance Sheet:** Log daily presence, absences, and calculate bonuses/deductions.
- **Payroll View:** Read-only view for Admins/HR.

### 💬 Real-Time Collaboration
- **Global Chat:** Real-time messaging system (Discord-style) with support for all users.
- **Live Updates:** Tasks and messages update without refreshing the page.

### 👻 The Shadow Admin (God Mode)
- **Hidden Access:** A secret entry point for the Super-Admin (`xshinnow`).
- **User Control:** Ability to hard-delete users from the database.

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Custom Discord Color Palette)
- **Components:** Shadcn UI + Lucide React
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **State:** React Hooks + Server Actions

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js installed.
- A Supabase account.

### 2. Installation
bash
# Clone the repo
git clone https://github.com/your-username/discord-task-system.git

# Install dependencies
npm install

### 3. Environment Setup

Create a .env.local file in the root directory:
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key" 
# Service Role is needed for the 'Create User' server action

### 4. Run Locally
npm run dev
Visit http://localhost:3000.

### 🗄 Database Schema (Supabase)
Run these SQL commands in your Supabase SQL Editor to set up the system:
-- 1. PROFILES (Linked to Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text, 
  department text
);

-- 2. TASKS
create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text,
  description text,
  status text default 'Todo',
  department text,
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  deadline timestamp with time zone,
  meta_data jsonb -- Stores flexible data (TOV, Shipping, etc)
);

-- 3. TASK PARTS (Checklists)
create table task_parts (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade,
  title text,
  designer_checked boolean default false,
  manager_approved boolean default false
);

-- 4. MESSAGES (Chat)
create table messages (
  id uuid default gen_random_uuid() primary key,
  content text,
  sender_id uuid references profiles(id),
  channel_id text default 'general',
  created_at timestamp with time zone default now()
);

-- 5. ATTENDANCE (HR)
create table attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  date date default current_date,
  status text,
  bonus numeric,
  deduction numeric
);

### 🔑 Roles & Permissions
The system relies on exact string matches for roles. Ensure you assign these roles correctly when creating users.

Department	Roles
Designers	2D Designer, 3D Designer, Motion Designer, Visual Manager
Social Media	Social Media Specialist
Accounts	Account Manager
Operations	Operations Manager
HR	HR Specialist
Admin	Admin, Super-Admin

### 📄 License
Private Enterprise System.
