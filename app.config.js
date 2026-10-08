// Ergänzt app.json: Für die Beta auf GitHub Pages liegt die Web-Version unter /echt-dating.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL && { baseUrl: process.env.EXPO_BASE_URL }) },
});
