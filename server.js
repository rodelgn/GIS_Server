const http = require('http');
const app = require('./app');

const port = process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(port, '129.150.47.67',() => {
    console.log(`Server is running on port ${port}`);
});