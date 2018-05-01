const crypto = require('crypto');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const hbs = require('hbs');

// create http server
const app = express();
hbs.registerPartials(path.resolve(__dirname, 'views/partials'));
// set handlebars as template engine
app.set('view engine', 'hbs');
// activate support for static content
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(bodyParser.json());

hbs.registerHelper('parseBlocks', (blocks) => {
  let out = '<div class="row">';
  for (const block of blocks) {
    out += `
    <div class="col-5">
      <table class="table table-bordered table-sm">
        <thead class="thead-dark">
          <tr>
            <th scope="col">Block</th>
            <th scope="col">#${block.index}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Nonce:</th>
            <td>${block.nonce}</td>
          </tr>
          <tr>
            <th scope="row">Timestamp:</th>
            <td>${block.timestamp}</td>
          </tr>
          <tr>
            <th scope="row">Tx:</th>
            <td>${JSON.stringify(block.data)}</td>
          </tr>
          <tr>
            <th scope="row">prevHash:</th>
            <td>${block.prevHash.substring(0, 20)}...${block.prevHash.substring(block.prevHash.length - 4)}</td>
          </tr>
          <tr>
            <th scope="row">Hash:</th>
            <td>${block.hash.substring(0, 20)}...${block.hash.substring(block.hash.length - 4)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `;
  }
  return `${out}</div>`;
});

// start listen on port 3000
app.listen(3000, () => {
  console.log('> Ready on http://localhost:3000');
});

// block structure
class Block {
  constructor(data = []) {
    this.index = 0;
    this.timestamp = new Date().getTime();
    this.data = data;
    this.nonce = 0;
    this.prevHash = '0';
    this.hash = this.SHA256();
  }
  // calculate block hash
  SHA256() {
    const message = `${this.index}${this.timestamp}${JSON.stringify(this.data)}${this.nonce}${this.prevHash}`;
    return crypto.createHash('sha256').update(message).digest('hex');
  }
  // add mine posibility (Proof-of-Work)
  mine(difficulty) {
    while (this.hash.substring(0, difficulty) !== new Array(difficulty + 1).join('0')) {
      this.nonce += 1;
      this.hash = this.SHA256();
    }
  }
}

// transaction structure
class Tx {
  constructor(from, to, amount) {
    this.from = from;
    this.to = to;
    this.amount = amount;
  }
}

// blockchain main class
class BlockChain {
  constructor(genesisText) {
    this.blocks = [];
    this.difficulty = 4;
    // list of pending transactions
    this.pendingTx = [];
    // miner reward in coins
    this.minerReward = 100;
    this.blocks.push(this.createGenesis(genesisText));
  }

  // create genesis block
  createGenesis(genesisText) {
    const newBlock = new Block(genesisText);
    newBlock.mine(this.difficulty);
    return newBlock;
  }

  // new block validation rules
  isValidBlock(newBlock) {
    // check block index
    if (newBlock.index !== this.lastBlock().index + 1) {
      console.log(`> [ERR] bad index: get ${newBlock.index} | expected ${this.lastBlock().index + 1}`);
      return false;
    }
    // check block timestamp
    const delta = newBlock.timestamp - this.lastBlock().timestamp;
    if (delta <= 0) {
      console.log(`> [ERR] bad block timestamp: get ${newBlock.timestamp} | last: ${this.lastBlock().timestamp}`);
      return false;
    }
    // update difficulty if needed (block shoud inne in 10 seconds)
    this.updateDifficulty(delta);
    // check block prev hash
    if (newBlock.prevHash !== this.lastBlock().hash) {
      console.log(`> [ERR] bad prev hash: get ${newBlock.prevHash} | expected ${this.lastBlock().hash}`);
      return false;
    }
    return true;
  }

  // update difficulty (block should mine in 5 seconds)
  updateDifficulty(delta) {
    if (this.difficulty < 2) {
      return;
    }
    if (delta < 5000) {
      this.difficulty += 1;
      console.log(`> [INFO] difficulty increased: ${this.difficulty}`);
    }
    if (delta > 5000) {
      this.difficulty -= 1;
      console.log(`> [INFO] difficulty decreased: ${this.difficulty}`);
    }
  }

  // get last block in chain
  lastBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  // add block to blockchain if it is correct
  addBlock(_newBlock, minerAddress) {
    const newBlock = _newBlock;
    newBlock.index = this.lastBlock().index + 1;
    newBlock.prevHash = this.lastBlock().hash;
    // add pending transactions to block
    newBlock.data = this.pendingTx;
    // recalculate hash
    newBlock.mine(this.difficulty);
    if (this.isValidBlock(newBlock) === true) {
      this.blocks.push(newBlock);
      console.log(`> [INFO] block mined: ${newBlock.hash}`);
      // reset pending transactions and give miner reward
      this.pendingTx = [new Tx(null, minerAddress, this.minerReward)];
      return true;
    }
    console.log('> [ERR] block mine failed');
    return false;
  }
  // push transaction to pending pool
  createTx(transaction) {
    this.pendingTx.push(transaction);
  }

  // get address balance
  getBalance(address) {
    let balance = 0;
    // iterate via blockchain to get balance of address
    for (const block of this.blocks) {
      for (const tx of block.data) {
        if (tx.from === address) {
          balance -= parseInt(tx.amount, 10) || 0;
        }
        if (tx.to === address) {
          balance += parseInt(tx.amount, 10) || 0;
        }
      }
    }
    return balance;
  }
}

// create new blockchain and init Bob balance
const blockchain = new BlockChain([
  { from: null, to: 'Bob', amount: 1000 },
]);

// ///////////////
// http interface
// ///////////////

// show all blocks
app.get('/', (req, res) => {
  res.render('index', {
    blocks: blockchain.blocks,
    difficulty: blockchain.difficulty,
    reward: blockchain.minerReward,
    Alice: blockchain.getBalance('Alice'),
    Bob: blockchain.getBalance('Bob'),
    Miner: blockchain.getBalance('Miner'),
  });
});

app.get('/mine', (req, res) => {
  const newBlock = new Block();
  if (blockchain.addBlock(newBlock, 'Miner') === true) {
    res.send(`block mined: ${JSON.stringify(newBlock)}`);
  } else {
    res.send();
  }
});

app.post('/tx', (req, res) => {
  console.log(`> [INFO] Get Tx: ${JSON.stringify(req.body)}`);
  const { from, to, amount } = req.body;
  blockchain.createTx({ from, to, amount });
  res.send({ result: 'success' });
});
