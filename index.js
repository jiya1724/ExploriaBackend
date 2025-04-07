const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = "your_secret_key"; 
const PORT = process.env.PORT || 3000;

const user = {
  username: "user",
  password: "password"
};


app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === user.username && password === user.password) {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

app.post('/logout', verifyToken, (req, res) => {
  
  return res.json({ message: "Logged out successfully" });
});

function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    
    const token = bearerHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.user = decoded;
      next();
    });
  } else {
    return res.status(403).json({ message: "Forbidden: No token provided" });
  }
}


const cache = new Map();

function getFromCache(key) {
  if (cache.has(key)) {
    const value = cache.get(key);
    
    cache.delete(key);
    cache.set(key, value);
    return { hit: true, value };
  }
  return { hit: false };
}

function setCache(key, value) {
  if (cache.size >= 15) {
    
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}


let latencies = [];

function expensiveFunction(inputValue) {
  return new Promise((resolve) => {
    setTimeout(() => {
      
      const result = Math.floor(Math.abs(Math.sin(inputValue) * 1000)) + 1;
      resolve(result);
    }, 2000); 
  });
}


app.get('/compute', verifyToken, async (req, res) => {
  let input = parseInt(req.query.input);
  if (isNaN(input) || input < 1 || input > 100) {
    return res.status(400).json({ message: "Input must be an integer between 1 and 100" });
  }

  const startTime = Date.now();
  let cacheResult = getFromCache(input);
  let result;
  let cacheStatus = '';

  if (cacheResult.hit) {
    result = cacheResult.value;
    cacheStatus = 'hit';
  } else {
    result = await expensiveFunction(input);
    setCache(input, result);
    cacheStatus = 'miss';
  }
  const endTime = Date.now();
  const latency = endTime - startTime;
  latencies.push(latency);

    if (latencies.length === 1000) {
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const index = Math.floor(0.9 * sortedLatencies.length);
    const p90 = sortedLatencies[index];
    console.log(`P90 latency after 1000 requests: ${p90} ms`);
    
    latencies = [];
  }

  res.json({
    input,
    result,
    cache: cacheStatus,
    latency: latency
  });
});

function binomialRand() {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let x = 5 * z + 50;
  x = Math.min(Math.max(1, Math.round(x)), 100);
  return x;
}


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
