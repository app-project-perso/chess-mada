const stockfish = new Worker("/stockfish-18-single.js");

stockfish.onmessage = (event) => {
  self.postMessage(event.data);
};

self.onmessage = (event) => {
  stockfish.postMessage(event.data);
};