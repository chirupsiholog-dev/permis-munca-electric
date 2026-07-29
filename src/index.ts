import express from 'express';
import authRoutes from './router/authRoutes.js'
import docRoutes from './router/docRoutes.js'

const app = express();
app.use(express.json()); //middleware for parsing json
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/documents', docRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})


