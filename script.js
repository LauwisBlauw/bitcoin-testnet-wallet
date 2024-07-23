const network = bitcoin.networks.testnet;
const apiBase = 'https://api.blockcypher.com/v1/btc/test3';
let wallet = null;

async function updateWalletInfo() {
    const walletInfo = document.getElementById('walletInfo');
    walletInfo.innerHTML = `
        <p><strong>Public Address:</strong> ${wallet.address}</p>
        <p><strong>Private Key:</strong> ${wallet.privateKey}</p>
    `;
    walletInfo.style.display = 'block';
    await updateBalance();
}

async function updateBalance() {
    const balanceInfo = document.getElementById('balanceInfo');
    try {
        const response = await axios.get(`${apiBase}/addrs/${wallet.address}/balance`);
        const balanceSatoshis = response.data.balance;
        const balanceBTC = balanceSatoshis / 100000000;
        balanceInfo.innerHTML = `<p><strong>Balance:</strong> ${balanceBTC} BTC</p>`;
        balanceInfo.style.display = 'block';
    } catch (error) {
        console.error('Error fetching balance:', error);
        balanceInfo.innerHTML = '<p>Error fetching balance</p>';
    }
}

document.getElementById('generateWallet').addEventListener('click', function() {
    const keyPair = bitcoin.ECPair.makeRandom({ network });
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
    
    wallet = {
        address: address,
        privateKey: keyPair.toWIF()
    };
    
    updateWalletInfo();
});

document.getElementById('sendBitcoin').addEventListener('click', async function() {
    if (!wallet) {
        alert('Please generate a wallet first.');
        return;
    }

    const recipient = document.getElementById('recipientAddress').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!recipient || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid recipient address and amount.');
        return;
    }

    try {
        const response = await axios.post(`${apiBase}/txs/new`, {
            inputs: [{ addresses: [wallet.address] }],
            outputs: [{ addresses: [recipient], value: Math.floor(amount * 100000000) }]
        });

        const keyPair = bitcoin.ECPair.fromWIF(wallet.privateKey, network);
        response.data.pubkeys = [];
        response.data.signatures = response.data.tosign.map(tosign => {
            const signature = keyPair.sign(Buffer.from(tosign, 'hex'));
            return signature.toString('hex');
        });

        const finalResponse = await axios.post(`${apiBase}/txs/send`, response.data);
        
        alert(`Transaction sent! TX Hash: ${finalResponse.data.tx.hash}`);
        updateBalance();
    } catch (error) {
        console.error('Error sending transaction:', error);
        alert('Error sending transaction. Check console for details.');
    }
});

// Initial setup
document.getElementById('walletInfo').style.display = 'none';
document.getElementById('balanceInfo').style.display = 'none';