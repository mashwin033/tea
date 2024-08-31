app.post('/reset', async (req, res) => {
    try {
        // Reset all lists and sets related to drinks and snacks
        await client.del('drinks', 'snacks', 'preferences', 'unique_drinks', 'unique_snacks');
        res.redirect('/');
    } catch (err) {
        console.error('Error resetting preferences:', err);
        res.render('home', { count: null, drinks: [], snacks: [], message: 'Error resetting preferences' });
    }
});

app.post('/decrement', async (req, res) => {
    const { type, item } = req.body;
    const listKey = type === 'drink' ? 'drinks' : 'snacks';
    const uniqueKey = type === 'drink' ? 'unique_drinks' : 'unique_snacks';

    try {
        // Decrement the item count by removing one occurrence from the list
        const index = await client.lPos(listKey, item);
        if (index !== null) {
            await client.lRem(listKey, 1, item);

            // Check if the item should be removed from the unique set
            const remaining = await client.lRange(listKey, 0, -1);
            if (!remaining.includes(item)) {
                await client.sRem(uniqueKey, item);
            }
        }
        res.redirect('/');
    } catch (err) {
        console.error('Error decrementing preference:', err);
        res.render('home', { count: null, drinks: [], snacks: [], message: 'Error decrementing preference' });
    }
});
