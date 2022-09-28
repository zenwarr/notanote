console.log("background worker started");

onmessage = e => {
  console.log("background worker received message", e);
}
