# ChatGenius Frontend

## Instructions for running the project:

1. Run `git clone https://github.com/NoahBPeterson/chat-genius-frontend.git`
2. Run `npm install`
3. Run `npm run dev` if running locally

   a. If running in production, run `npm run build` and point your webserver to the build folder

After running the above commands, set up the backend as well:

1. Run `git clone https://github.com/NoahBPeterson/chat-genius-backend.git`
2. Run `npm install`
3. Run `npm run db:start`
4. Run `npm start`
5. If running in production, run `pm2 start "npm start" --name chat-genius-backend`, `pm2 startup`, and `pm2 save`

## Features

- [x] Login
- [x] Register
- [x] Logout
- [x] Chat
- [x] Chat History
- [x] Threading
- [x] Emojis
- [x] Channel Creation
- [x] User presence (online/offline, idle, x is typing, etc.)
- [x] Full-text search of comments
- [x] File upload and image embedding
- [x] RAG Agent - Just "@" someone, and their agent will respond
- [x] Productivity Enhancements - Moondream.ai powered tool that tells you to get back to work if you're not working
