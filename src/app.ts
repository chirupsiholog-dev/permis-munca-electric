import express from 'express';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './router/authRoutes.js'
import docRoutes from './router/docRoutes.js'
import namirialRoutes from './router/namirialRoutes.js';
import { openapiSpec } from './docs/openapi.js';
import cors from 'cors'


const app = express();
app.use(express.json()); //middleware for parsing incoming json
app.use(express.urlencoded({ extended: true }));

//enabling cors so react can talk to the server
app.use(cors());


const swaggerCss = `
  .swagger-ui .renderedMarkdown p,
  .swagger-ui .renderedMarkdown li { line-height: 1.7; }
  .swagger-ui .renderedMarkdown code {
    font-size: 0.85em;
    font-weight: 500;
    padding: 0 4px;
    color: #6d28d9;
    background: rgba(0, 0, 0, .06);
    border-radius: 3px;
    word-break: break-word;
  }
`;

//serve the raw OpenAPI document and the Swagger UI that renders it
app.get('/api-docs.json', (_req, res) => res.json(openapiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    swaggerOptions: { persistAuthorization: true }, //keep the bearer token across page reloads
    customSiteTitle: 'Permis Electric de Munca API docs',
    customCss: swaggerCss
}));

app.use('/api/auth', authRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/namirial', namirialRoutes);
app.use('/api/site-reports');

export default app;
