document.getElementById('countForm').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent the default form submission

    fetch('/give-count', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Clear the results section before updating
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';

        // Display the drink counts
        const drinkHeading = document.createElement('h2');
        drinkHeading.textContent = 'Drinks';
        resultsContainer.appendChild(drinkHeading);

        const drinkList = document.createElement('ul');
        for (const [drink, count] of Object.entries(data.drinks)) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                ${drink}: ${count}
                <form action="/reduce-count" method="POST" style="display: inline;">
                    <input type="hidden" name="item" value="${drink}">
                    <input type="hidden" name="type" value="drink">
                    <button type="submit" class="reduceBtn">-</button>
                </form>
            `;
            drinkList.appendChild(listItem);
        }
        resultsContainer.appendChild(drinkList);

        // Display the snack counts
        const snackHeading = document.createElement('h2');
        snackHeading.textContent = 'Snacks';
        resultsContainer.appendChild(snackHeading);

        const snackList = document.createElement('ul');
        for (const [snack, count] of Object.entries(data.snacks)) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                ${snack}: ${count}
                <form action="/reduce-count" method="POST" style="display: inline;">
                    <input type="hidden" name="item" value="${snack}">
                    <input type="hidden" name="type" value="snack">
                    <button type="submit" class="reduceBtn">-</button>
                </form>
            `;
            snackList.appendChild(listItem);
        }
        resultsContainer.appendChild(snackList);

        // Attach event listeners to the new reduce buttons
        attachReduceButtonListeners();
    })
    .catch(error => console.error('Error:', error));
});

document.addEventListener('DOMContentLoaded', () => {
    const reduceButtons = document.querySelectorAll('.reduceBtn');

    reduceButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();

            const id = this.getAttribute('data-id');
            const type = this.getAttribute('data-type');

            fetch('/reduce-count', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, type })
            })
            .then(response => {
                if (response.ok) {
                    location.reload();
                } else {
                    console.error('Failed to reduce count:', response.status);
                }
            })
            .catch(error => console.error('Error:', error));
        });
    });
});

    });
}

// Initial setup to attach listeners after page load
attachReduceButtonListeners();
