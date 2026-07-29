import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import authRoutes from './router/authRoutes.js'

const app = express();
app.use(express.json()); //middleware for parsing json
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})
