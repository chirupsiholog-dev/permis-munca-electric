import express from 'express';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './router/authRoutes.js'
import docRoutes from './router/docRoutes.js'
import namirialRoutes from './router/namirialRoutes.js';
import { openapiSpec } from './docs/openapi.js';

const app = express();
app.use(express.json()); //middleware for parsing json
app.use(express.urlencoded({ extended: true }));

//serve the raw OpenAPI document and the Swagger UI that renders it
app.get('/api-docs.json', (_req, res) => res.json(openapiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    swaggerOptions: { persistAuthorization: true }, //keep the bearer token across page reloads
    customSiteTitle: 'Permis Electric de Munca API docs'
}));

app.use('/api/auth', authRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/namirial', namirialRoutes);

app.listen(3030, () => {
    console.log('Server is running on port 3030');
    console.log('API docs available at http://localhost:3030/api-docs');
})
