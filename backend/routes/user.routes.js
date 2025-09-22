import express from 'express';
import multer from 'multer';

const userRouter = express.Router();
const upload = multer();

export default userRouter;