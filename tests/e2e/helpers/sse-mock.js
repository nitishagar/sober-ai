function sseBody(events) {
  return events.map(e => `data: ${JSON.stringify(e)}\n\n`).join('');
}

module.exports = { sseBody };
