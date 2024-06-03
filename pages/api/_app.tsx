export const HOSTNAME= process.env.NODE_ENV === "development"
? "http://localhost:3000"
: "https://recruitment-v3.vercel.app"