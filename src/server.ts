
import express from 'express';
import morgan from 'morgan';
import rolRouter from './routes/rol.routes';
import userRouter from './routes/user.routes';
import authRouter from './routes/auth.routes';


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/rol', rolRouter)
app.use('/api/user', userRouter) 
app.use('/api/auth', authRouter)
// app.use(errorHandler)

export default app;