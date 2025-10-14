import express from 'express';
import DownloadController from '../controllers/download.controller.js';

const downloadRoutes = express.Router();

downloadRoutes.get('/:bucket/:instituicaoId/:fileName', DownloadController.getFile);

export default downloadRoutes;