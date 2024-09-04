const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = redis.createClient({ url: redisUrl });

(async () => {
    await client.connect();
})();

client.on('error', (err) => console.log('Redis Client Error', err));

const drinks = ['Tea', 'Coffee', 'Black Tea', 'Black Coffee', 'Lime Tea', 'Boost', 'Horlicks', 'Other'];
const snacks = ['Cutlet', 'Puffs', 'Ela Ada', 'Bread Pouch', 'Other'];

app.get('/', async (req, res) => {
    try {
        const order = await getOrderFromCache();
        res.render('home', { order, drinks, snacks });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).send('Error fetching order');
    }
});

app.post('/submit', async (req, res) => {
    const { drinkChoice, drinkOther, drinkQuantity, snackChoice, snackOther, snackQuantity } = req.body;

    try {
        const currentOrder = await getOrderFromCache();

        const newOrder = {
            drink: {
                name: drinkChoice === 'Other' ? drinkOther : drinkChoice,
                quantity: currentOrder.drink.quantity + (parseInt(drinkQuantity) || 0)
            },
            snack: {
                name: snackChoice === 'Other' ? snackOther : snackChoice,
                quantity: currentOrder.snack.quantity + (parseInt(snackQuantity) || 0)
            }
        };

        await saveOrderToCache(newOrder);
        res.redirect('/');
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).send('Error saving order');
    }
});

app.post('/decrement/:item', async (req, res) => {
    const item = req.params.item;
    try {
        const order = await getOrderFromCache();
        if (order[item].quantity > 0) {
            order[item].quantity--;
            await saveOrderToCache(order);
        }
        res.redirect('/');
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).send('Error updating order');
    }
});

app.post('/reset', async (req, res) => {
    try {
        await client.del('order');
        res.redirect('/');
    } catch (error) {
        console.error('Error resetting order:', error);
        res.status(500).send('Error resetting order');
    }
});

async function getOrderFromCache() {
    const cachedOrder = await client.get('order');
    return cachedOrder ? JSON.parse(cachedOrder) : { drink: { name: '', quantity: 0 }, snack: { name: '', quantity: 0 } };
}

async function saveOrderToCache(order) {
    await client.set('order', JSON.stringify(order));
}

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
