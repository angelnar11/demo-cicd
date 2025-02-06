const express = require('express');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.static('public'));

const timestamp = new Date().getTime();

app.get('/', (req, res) => {
    const arguments = process.argv.slice(2);
    const customer = arguments[0] || 'Customer';
    const content = fs.readFileSync('index.html', 'utf8');
    const updatedContent = content.replace('Customer', `${customer} - ${timestamp}`);
    res.send(updatedContent);
});

const server = app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});

const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);

    server.close(() => {
        console.log('Server closed.');
        process.exit(0); // Exit successfully
    });

    server.getConnections((err, count) => {
        if (err) console.error(err);
        server.closeAllConnections();
    });

    // Set a timeout to force exit if the server doesn't close gracefully
    setTimeout(() => {
        console.error('Server shutdown timed out, forcing exit.');
        process.exit(1); // Exit with an error code
    }, 10000); // 10 seconds timeout
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);