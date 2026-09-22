# Smart Pooling — Employee Ride Sharing & Commute Coordination

A production-quality hackathon application for enterprise employees travelling from the same office/campus to common destinations around similar times. Employees can post trips, discover compatible colleagues, form pools, coordinate pickup points, and split auto/taxi fares.

---

## 🍃 MongoDB Atlas Setup

This application supports persistent cloud data storage with **MongoDB Atlas** via Mongoose.

### 1. Get your MongoDB Atlas URI
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free M0 cluster (e.g. `Cluster0`).
3. Under **Database Access**, create a user with read and write privileges.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) so Vercel serverless functions can connect.
5. In **Database** > **Connect** > **Drivers**, copy your connection string:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/smart_pooling?retryWrites=true&w=majority"
   ```

### 2. Automatic Seeding
- As soon as the application starts with a valid `MONGODB_URI`, it checks whether collections are empty.
- If empty, it **automatically seeds** all sample employees (Steven Paul, Arun Kumar, Neha Sharma, Akash Roy, etc.), locations (UST Campus, Trivandrum Central, Technopark Phase 1, Airport, etc.), Friday commute trips, and ride pools.
- You can also trigger a re-seed at any time by calling `POST /api/seed` or using the **"Reset Demo Data"** action in the UI.

---

## 🚀 Deploying to Vercel

The application is configured for Vercel:
- **Frontend**: High-performance React SPA built to `dist/`.
- **Backend**: Express API routed seamlessly through Vercel Serverless Functions via `/api/index.ts` and `vercel.json`.

### Steps:
1. Push this repository to your GitHub account.
2. In [Vercel](https://vercel.com), click **Add New Project** and import the repository.
3. Configure **Environment Variables** in Vercel:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `GEMINI_API_KEY`: Your Google Gemini API key (for AI commute insights).
4. Click **Deploy**.

The `/api/*` routes are handled by Vercel Serverless Functions with persistent MongoDB Atlas caching, and the frontend is served with routing support.
