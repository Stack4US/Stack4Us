## Stack4Us

Project overview

Stack4Us is a small web platform that helps beginner programmers unblock themselves faster. The main idea is to learn by working with other people. Instead of reading long documentation alone, a user can describe the problem, receive comments from the community, and choose the best answer. The project focuses on faster learning, better problem-solving, practical research, and simple communication between peers.

How it works

A coder creates a post with a clear description of an error or a question. Other users add answers and suggestions. Answers can receive ratings so the most useful one is easy to find. The platform also includes a weekly ranking, simple notifications, and a basic search. There is an integration with Stack Overflow to check related questions without leaving the site. An admin can moderate users and content. The goal is to keep the flow simple: write the problem, get feedback, learn something new, and move on.

Technology

The frontend is a Single Page Application built with Vite and JavaScript.
The backend is an API built with Node.js and Express.
Data is stored in PostgreSQL using Supabase.
The repository uses Git and GitHub. The project can be deployed to common services such as Vercel (frontend) and a node host for the API.

you can see the project deployed in the following link: https://stack4-us-qakt.vercel.app/about.html 

Installation and execution

First, clone the repository and move into the project folder.

git clone https://github.com/Stack4US/Stack4Us.git
cd stack4us

Backend

Create an environment file for the backend. Do not share real secrets in the README. Use placeholders and keep the .env file out of version control.

Create Backend/.env with the following keys:

# Database configuration
DB_HOST=your-db-host
DB_PORT=6543
DB_NAME=postgres
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-or-anon-key


Install dependencies and start the server.

cd Backend
npm install
npm run dev
The backend runs by default at http://localhost:3000.

Frontend

Install dependencies and start the development server.


cd ../frontend
npm install
npm run dev

The frontend runs by default at http://localhost:5173.

Roles and permissions

There are three simple roles. A Coder can create posts and add answers. A Team Leader can also participate and help other users more actively. An Admin can moderate content and users and keep the space clean. The role information is stored in the token and used by the frontend to show the correct options.

Main features in the first version

The first version aims to be a practical forum for students and junior developers. Users can register, log in, and manage their profile. A coder can create a post with a title, a description, an optional language tag, and an optional image. The owner can later edit or delete the post.

Other users can answer with text and, if needed, an image. Each answer can receive a star rating. The average rating helps to identify the most helpful answer. A small ranking highlights active users every week. When someone receives a new answer or a rating, the system creates a simple notification. There is also a page to search content on Stack Overflow directly from the app.

Admins have access to moderation tools. They can review posts and users, adjust roles when necessary, and view basic statistics. Search and filters help to find posts by text or by language tag.

Product story

As a user of Stack4Us, I want one place where I can describe a coding problem, receive guidance from other people, and quickly test a possible solution. I also want a fair way to reward helpful answers and a simple history of what I learned. The project tries to reduce the time blocked on errors and increase the quality of collaboration inside a small team.

Security note

Do not publish real database credentials, API keys, or Cloudinary secrets in the repository or in public documents. Use .env files locally and keep them out of Git with .gitignore. If a secret was exposed by mistake, rotate it immediately in your provider and update the environment files.

Credits

This project was created by a small team: Ana María Barragán, Jackson Alberto Flores Pérez, Daniel Ramírez Agudelo, Jeferson Escudero Rua, and Anderson Blandon Álvarez. The team goal is to build a friendly space where people can learn, share and grow together through real problems and simple solutions.
