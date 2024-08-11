const express = require('express');
const redis = require('redis');
const app = express();

const redisUrl = 'redis://red-cqs8lhrqf0us738u48a0:6379';
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.connect().then(() => {
    console.log('Connected to Redis');
}).catch(console.error);

app.use(express.urlencoded({ extended: true }));

app.post('/submit', async (req, res) => {
    const { drink, snack } = req.body;

    // Store only non-empty values
    if (drink) {
        await client.rPush('drinks', drink);
    }

    if (snack) {
        await client.rPush('snacks', snack);
    }

    res.redirect('/results');
});

app.get('/results', async (req, res) => {
    const drinks = await client.lRange('drinks', 0, -1);
    const snacks = await client.lRange('snacks', 0, -1);

    res.send(`
        <h1>Results</h1>
        <p>Drink Count: ${drinks.length}</p>
        <p>Snack Count: ${snacks.length}</p>
        <a href="/">Go back</a>
    `);
});

app.post('/clear-preferences', async (req, res) => {
    await client.del('drinks');
    await client.del('snacks');
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
