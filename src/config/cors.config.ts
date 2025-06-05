import { CorsOptions } from "cors";


export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const whiteList = [process.env.FRONTEND_URL || 'http://localhost:5173']
    if(!origin || whiteList.includes(origin)) {
      callback(null, true)  
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
}