import app from './app.js';

//local development entry point only
const port = Number(process.env.PORT ?? 3030);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`API docs available at http://localhost:${port}/api-docs`);
});
