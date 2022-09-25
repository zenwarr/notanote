console.log("background worker started");
console.log("indexeddb: ", indexedDB);
console.log("fetch: ", fetch);

onmessage = e => {
  console.log("background worker received message", e);
  postMessage("background worker response");
}
