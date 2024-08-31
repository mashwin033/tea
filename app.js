const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const crypto = require('crypto');
const app = express();
const PORT = 3000;

// Redis client setup (unchanged)
// ...

app.post('/submit', async (req, res) => {
    const { drink, snack } = req.body;
    
    try {
        if (drink) {
            await client.rPush('drinks', drink);
        }
        if (snack) {
            await client.rPush('snacks', snack);
        }
        
        const preference = JSON.stringify({ drink, snack });
        await client.rPush('preferences', preference);
        
        const preferences = await client.lRange('preferences', 0, -1);
        console.log('Retrieved preferences:', preferences); // Debugging log
        
        const count = preferences.reduce((acc, pref) => {
            try {
                const parsedPref = JSON.parse(pref);
                if (parsedPref.drink) {
                    acc.drinks[parsedPref.drink] = (acc.drinks[parsedPref.drink] || 0) + 1;
                }
                if (parsedPref.snack) {
                    acc.snacks[parsedPref.snack] = (acc.snacks[parsedPref.snack] || 0) + 1;
                }
            } catch (parseError) {
                console.error('Error parsing preference:', pref, parseError);
            }
            return acc;
        }, { drinks: {}, snacks: {} });
        
        console.log('Calculated count:', count); // Debugging log
        
        res.render('results', { count });
    } catch (err) {
        console.error('Error in /submit route:', err);
        res.status(500).send('Internal Server Error: ' + err.message);
    }
});

// ... (rest of the code remains unchanged)
