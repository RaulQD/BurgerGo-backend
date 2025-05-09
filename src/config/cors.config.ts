import { CorsOptions } from "cors";


export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const whiteList = [process.env.FRONTEND_URL || 'http://localhost:3000']
    if(whiteList.includes(origin)|| !origin) {
      callback(null, true)  
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
}