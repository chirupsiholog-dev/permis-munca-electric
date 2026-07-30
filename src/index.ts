import express from 'express';
import authRoutes from './router/authRoutes.js'
import docRoutes from './router/docRoutes.js'
import namirialRoutes from './router/namirialRoutes.js';

const app = express();
app.use(express.json()); //middleware for parsing json
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/documents', docRoutes);
app.use('api/namirial', namirialRoutes);

app.listen(3030, () => {
    console.log('Server is running on port 3030');
})
